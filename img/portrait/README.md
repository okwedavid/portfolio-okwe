# Okwe David — turntable bust

`okwe-bust.glb` is a self-contained glTF 2.0 asset (~790 kB), with **12,184 vertices**, **24,072 triangles**, and an embedded JPEG atlas. The face is not a billboard: the brow, nose, lips and chin have depth, and the skull, neck and jacket continue around the rear.

The front is projected from Okwe's supplied photograph. Facial depth was estimated locally during authoring with MediaPipe Face Mesh; the profile, nape and back were sculpted, using an AI-generated lateral material reference for the unseen surfaces. This is a single-view interpretation, not a measured likeness from other angles. No landmark data, fitting code, model weights or original upload are needed by the site.

`src/portrait.js` reads this asset's single interleaved position/normal/UV stream and indexed triangles. It lights and depth-tests the mesh once per pose, then composites the result at the Nigeria pin and About. If replacing the GLB with a different layout, update that small asset-specific reader or use a general glTF loader. A conventional glTF viewer can open the file directly.
