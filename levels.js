/* Level data for Burger Boss.
 *
 * Coordinates are in world pixels, origin top-left. The camera scrolls
 * horizontally only, so every level is 540 tall and as wide as it likes.
 *
 *   platform  {x, y, w, h}                  solid, landable
 *             + patrol {axis, range, speed} makes it a moving platform
 *   grill     {x, y, w, h}                  deadly while its flames are lit
 *             + patrol {axis, range, speed} makes it slide back and forth
 *             + pulse  {on, off, offset}    flames cycle; safe while out
 *   hotdog    {x, y}                        collect them all to open the exit
 *   goal      {x, y}                        the picnic table you escape to
 */

const LEVELS = [
  {
    name: 'Backyard Cookout',
    hint: 'Six hot dogs. Hop the grills. Easy does it.',
    width: 2000,
    height: 540,
    sky: ['#8fd4f2', '#d9f0fb'],
    spawn: { x: 70, y: 400 },
    platforms: [
      { x: 0, y: 480, w: 640, h: 60 },
      { x: 740, y: 480, w: 520, h: 60 },
      { x: 1360, y: 480, w: 640, h: 60 },
      { x: 380, y: 380, w: 140, h: 20 },
      { x: 860, y: 370, w: 150, h: 20 },
      { x: 1080, y: 270, w: 130, h: 20 },
      { x: 1480, y: 360, w: 150, h: 20 },
      { x: 1720, y: 270, w: 150, h: 20 }
    ],
    hotdogs: [
      { x: 200, y: 446 },
      { x: 440, y: 346 },
      { x: 910, y: 336 },
      { x: 1120, y: 236 },
      { x: 1540, y: 326 },
      { x: 1780, y: 236 }
    ],
    grills: [
      { x: 560, y: 432, w: 80, h: 48 },
      { x: 1160, y: 432, w: 80, h: 48 }
    ],
    goal: { x: 1880, y: 404 }
  },

  {
    name: 'Grill Alley',
    hint: 'Eight hot dogs. Some grills walk, some flare up.',
    width: 2600,
    height: 540,
    sky: ['#f7b26a', '#ffe0b0'],
    spawn: { x: 60, y: 400 },
    platforms: [
      { x: 0, y: 480, w: 520, h: 60 },
      { x: 640, y: 480, w: 360, h: 60 },
      { x: 1120, y: 480, w: 300, h: 60 },
      { x: 1560, y: 480, w: 340, h: 60 },
      { x: 2020, y: 480, w: 580, h: 60 },
      { x: 300, y: 370, w: 130, h: 20 },
      { x: 520, y: 280, w: 120, h: 20 },
      { x: 820, y: 350, w: 140, h: 20 },
      { x: 1030, y: 250, w: 120, h: 20 },
      { x: 1300, y: 340, w: 140, h: 20 },
      { x: 1620, y: 300, w: 130, h: 20 },
      { x: 1880, y: 220, w: 140, h: 20 },
      { x: 2180, y: 330, w: 150, h: 20 }
    ],
    hotdogs: [
      { x: 160, y: 446 },
      { x: 340, y: 336 },
      { x: 560, y: 246 },
      { x: 870, y: 316 },
      { x: 1070, y: 216 },
      { x: 1345, y: 306 },
      { x: 1920, y: 186 },
      { x: 2230, y: 296 }
    ],
    grills: [
      { x: 380, y: 432, w: 80, h: 48 },
      { x: 760, y: 432, w: 80, h: 48, patrol: { axis: 'x', range: 150, speed: 70 } },
      { x: 1200, y: 432, w: 80, h: 48, pulse: { on: 1.4, off: 1.1 } },
      { x: 1650, y: 432, w: 80, h: 48 },
      { x: 2100, y: 432, w: 80, h: 48, patrol: { axis: 'x', range: 220, speed: 90 } }
    ],
    goal: { x: 2480, y: 404 }
  },

  {
    name: 'Inferno Kitchen',
    hint: 'Ten hot dogs, wider gaps, and the floor keeps moving.',
    width: 3200,
    height: 540,
    sky: ['#8a3b4e', '#f0846a'],
    spawn: { x: 60, y: 400 },
    platforms: [
      { x: 0, y: 480, w: 420, h: 60 },
      { x: 560, y: 480, w: 220, h: 60 },
      { x: 950, y: 480, w: 180, h: 60 },
      { x: 1300, y: 480, w: 200, h: 60 },
      { x: 1670, y: 480, w: 170, h: 60 },
      { x: 2010, y: 480, w: 250, h: 60 },
      { x: 2420, y: 480, w: 200, h: 60 },
      { x: 2780, y: 480, w: 420, h: 60 },
      { x: 250, y: 360, w: 130, h: 20 },
      { x: 640, y: 300, w: 120, h: 20 },
      { x: 1000, y: 330, w: 120, h: 20 },
      { x: 1180, y: 230, w: 110, h: 20 },
      { x: 1380, y: 330, w: 120, h: 20 },
      { x: 1720, y: 290, w: 120, h: 20 },
      { x: 1900, y: 200, w: 120, h: 20 },
      { x: 2100, y: 300, w: 120, h: 20 },
      { x: 2500, y: 330, w: 120, h: 20 },
      { x: 2700, y: 230, w: 130, h: 20 },
      { x: 2950, y: 340, w: 130, h: 20 },
      { x: 820, y: 390, w: 110, h: 20, patrol: { axis: 'y', range: 130, speed: 55 } },
      { x: 1520, y: 360, w: 110, h: 20, patrol: { axis: 'x', range: 140, speed: 85 } },
      { x: 2280, y: 340, w: 110, h: 20, patrol: { axis: 'y', range: 140, speed: 70 } }
    ],
    hotdogs: [
      { x: 290, y: 326 },
      { x: 680, y: 266 },
      { x: 1040, y: 296 },
      { x: 1215, y: 196 },
      { x: 1420, y: 296 },
      { x: 1760, y: 256 },
      { x: 1940, y: 166 },
      { x: 2140, y: 266 },
      { x: 2740, y: 196 },
      { x: 2990, y: 306 }
    ],
    grills: [
      { x: 300, y: 432, w: 80, h: 48 },
      { x: 620, y: 432, w: 80, h: 48, pulse: { on: 1.2, off: 0.9 } },
      { x: 990, y: 432, w: 80, h: 48 },
      { x: 1330, y: 432, w: 80, h: 48, patrol: { axis: 'x', range: 90, speed: 95 } },
      { x: 2030, y: 432, w: 80, h: 48, patrol: { axis: 'x', range: 140, speed: 110 } },
      { x: 2450, y: 432, w: 80, h: 48, pulse: { on: 1.0, off: 0.8, offset: 0.4 } },
      { x: 2850, y: 432, w: 80, h: 48, patrol: { axis: 'x', range: 130, speed: 100 } }
    ],
    goal: { x: 3120, y: 404 }
  }
];
