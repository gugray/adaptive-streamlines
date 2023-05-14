# Variable-density streamlines generator

This library produces aesthetically pleasing streamline visualizations of flow fields. Think of this like a wind map. We know the wind's direction at every point on a grid, and we want to overlay that data on a map using lines that always follow the wind's direction.

The tricky part in doing this is to create streamlines that are evenly spaced and preferably long. A good method to do this comes from Jobard and Lefer, who published it in their 1997 paper [Creating Evenly-Spaced Streamlines of Arbitrary Density](https://web.cs.ucdavis.edu/~ma/SIGGRAPH02/course23/notes/papers/Jobard.pdf). It was implemented in Javascript by Andrei Kashcha as the [streamlines](https://github.com/anvaka/streamlines) library; my library is derived directly from Andrei's work.

In the original Jobard-Lefer algorithm the density of streamlines is configurable, but it is uniform over the entire area. My derived algorithm lets you to control the streamlines' density through a second, arbitrary function. If the density is the brightness of pixels in an image, then this allows visualizing photos like this:

![Portrait of Josephine Baker rendered as a flow field](variable-flowlines-2.jpg)

My focus with this library is not on data visualization but on generative art. Think of explorations like this image, which shows a Perlin noise field that is denser along a ring and lighter in the center and at the edges.

![Flow field with a mathematical density function](variable-flowlines-1.jpg)
