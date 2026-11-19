import { NORTH, EAST, EQUATOR, EARTH_RADIUS } from './solar-motion.js';

const DAY = new URL('../img/earth/day.webp', import.meta.url);
const NIGHT = new URL('../img/earth/night.webp', import.meta.url);
const vertex = `attribute vec2 position; varying vec2 p;
void main(){p=position/${(2 * EARTH_RADIUS).toFixed(3)};gl_Position=vec4(position,0.,1.);}`;
const fragment = `
precision highp float;
varying vec2 p;
uniform sampler2D dayMap, nightMap;
uniform vec3 pole, east, equator, sun;
uniform float longitude, flux;

void main() {
  float r=length(p);
  if(r>1.15){gl_FragColor=vec4(0.);return;}
  vec2 limb=p/max(r,.0001);
  float limbSun=dot(limb,sun.xy);
  float litRim=smoothstep(-.12,.65,limbSun);
  // Forward scattering is strongest on the limb nearest a backlighting Sun.
  float alignment=max(0.,limbSun/max(.001,length(sun.xy)));
  float aureole=pow(alignment,18.)*smoothstep(.12,.68,-sun.z);
  if(r>1.) {
    float height=r-1.;
    float thin=exp(-height*172.);
    float haze=exp(-height*48.);
    float a=(thin*.78+haze*.13)*(.055+.9*litRim)+haze*.26*aureole;
    vec3 tint=mix(vec3(.37,.69,1.),vec3(1.,.81,.55),aureole);
    gl_FragColor=vec4(tint,min(1.,a));return;
  }
  vec3 n=vec3(p,sqrt(max(0.,1.-dot(p,p))));
  vec2 uv=vec2(fract(.5+(longitude+atan(dot(n,east),dot(n,equator)))/6.283185307),
               .5-asin(clamp(dot(n,pole),-1.,1.))/3.141592654);
  vec3 day=texture2D(dayMap,uv).rgb, night=texture2D(nightMap,uv).rgb;
  float mu=dot(n,sun); // cosine of the local solar zenith angle
  float direct=max(0.,mu)*flux;
  float twilight=smoothstep(-.16,.10,mu);
  vec3 albedo=pow(day,vec3(2.2));
  vec3 beam=mix(vec3(1.,.51,.24),vec3(1.,.97,.91),smoothstep(-.02,.32,mu));
  vec3 radiance=albedo*(vec3(.012,.018,.028)+twilight*vec3(.014,.026,.042)+1.24*direct*beam);
  // Cities switch on past twilight. Suppress the night map's atlas background.
  float lamps=max(0.,night.r-.60*night.b-.012);
  radiance+=vec3(1.,.62,.27)*pow(lamps,1.13)*1.55*(1.-smoothstep(-.18,.04,mu));
  // The clouded day map is our conservative water mask: avoid shiny land/clouds.
  float water=smoothstep(.018,.115,day.b-day.r)*smoothstep(.01,.075,day.g-day.r)
             *(1.-smoothstep(.43,.71,dot(day,vec3(.2126,.7152,.0722))));
  vec3 halfway=normalize(sun+vec3(0.,0.,1.));
  float nh=max(0.,dot(n,halfway));
  float fresnel=.028+.972*pow(1.-max(0.,dot(sun,halfway)),5.);
  float glint=water*fresnel*(15.*pow(nh,115.)+.68*pow(nh,20.));
  radiance+=beam*glint*smoothstep(0.,.08,mu)*flux;
  // Rayleigh-blue air on the lit edge, with a narrower, warm grazing-light band.
  float rim=pow(1.-n.z,3.3);
  radiance+=rim*(vec3(.002,.005,.012)+litRim*vec3(.073,.27,.54));
  radiance+=pow(1.-n.z,5.)*aureole*vec3(.78,.35,.09);
  radiance+=vec3(.0007,.0012,.0022);
  vec3 color=pow(radiance/(.98+.16*radiance),vec3(1./2.2));
  gl_FragColor=vec4(color,1.);
}`;

export async function globe(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power',
  });
  if (!gl) throw new Error('Static Earth fallback');
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Static Earth fallback');
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Static Earth fallback');
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const loc = (name) => gl.getUniformLocation(program, name);
  gl.uniform3fv(loc('pole'), NORTH);
  gl.uniform3fv(loc('east'), EAST);
  gl.uniform3fv(loc('equator'), EQUATOR);
  await Promise.all(
    [
      [DAY, 'dayMap'],
      [NIGHT, 'nightMap'],
    ].map(async ([url, name], i) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      for (const axis of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, axis, gl.CLAMP_TO_EDGE);
      for (const filter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, filter, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.uniform1i(loc(name), i);
    }),
  );
  const lon = loc('longitude'),
    light = loc('sun'),
    power = loc('flux');
  return ({ longitude, sun, flux }, size) => {
    if (!size || gl.isContextLost()) return;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
      gl.viewport(0, 0, size, size);
    }
    gl.uniform1f(lon, longitude);
    gl.uniform3fv(light, sun);
    gl.uniform1f(power, flux);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}
