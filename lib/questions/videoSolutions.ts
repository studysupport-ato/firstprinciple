/**
 * Figures and video solutions for question-bank questions.
 *
 * A question opts in with the Markdown header line **Media:** <key>; the
 * importer stores it as the tag "media:<key>". The figure is a redrawn SVG
 * under /public; the video is a YouTube embed credited to its channel, and
 * `source` credits the textbook (or the video) the problem comes from.
 * To jump to a problem inside a longer video, add `start` (seconds).
 * Generated from the ME 161 question data; edit freely.
 */
export interface VideoSolution {
  key: string;
  figure: string;
  figureAlt: string;
  /** Unit shown next to a numerical answer box, e.g. "kN". */
  unit: string;
  video: { youtubeId: string; title: string; channel: string; minutes: number | null; part: string; start?: number };
  /** Where the problem comes from. */
  source: string;
}

const SOLUTIONS: VideoSolution[] = [
  {
    "key": "me161-d1",
    "figure": "/questions/me-161/d1.svg",
    "figureAlt": "Screw eye hanging from a ceiling with a 6 kN force pulling 60 degrees below the negative x axis and a 2 kN force 45 degrees below the positive x axis",
    "unit": "kN",
    "video": {
      "youtubeId": "aiaUT2Sgqq4",
      "title": "🔺02 - Parallelogram Law of Vector Addition | Fundamental Problems R.C Hibbeler F2-1,2,3",
      "channel": "SkanCity Academy",
      "minutes": 20,
      "part": "First example (F2-1)"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics, fundamental problem F2-1"
  },
  {
    "key": "me161-d2",
    "figure": "/questions/me-161/d2.svg",
    "figureAlt": "Hook with three forces: 300 N along positive x, 400 N at 30 degrees above x, and 250 N up and to the left on a 3-4-5 slope (4 horizontal, 3 vertical)",
    "unit": "N",
    "video": {
      "youtubeId": "3PBbOi6i-FE",
      "title": "🔺04 - Resolution of Forces 1 | Fundamental Problems R.C Hibbeler F2-7 and F2-8",
      "channel": "SkanCity Academy",
      "minutes": 15,
      "part": "Second example (F2-8)"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics, fundamental problem F2-8"
  },
  {
    "key": "me161-f1",
    "figure": "/questions/me-161/f1.svg",
    "figureAlt": "Force F drawn from the origin, pointing mostly up along z with a small positive x part and a small negative y part",
    "unit": "°",
    "video": {
      "youtubeId": "TtKkyOpCldM",
      "title": "🔺07 - Cartesian Vectors and Direction Cosines 1 - Example 1",
      "channel": "SkanCity Academy",
      "minutes": 20,
      "part": "Worked example near the end of the video"
    },
    "source": "an example set in the video"
  },
  {
    "key": "me161-f2",
    "figure": "/questions/me-161/f2.svg",
    "figureAlt": "500 N force from the origin pointing up, toward the viewer and toward negative y, making 60 degrees with the x axis and 60 degrees with the z axis",
    "unit": "°",
    "video": {
      "youtubeId": "t6VttrH6_yc",
      "title": "🔺08 - Cartesian Vectors and Direction Cosines 2 - Solved Examples (2 & 3",
      "channel": "SkanCity Academy",
      "minutes": 16,
      "part": "Second example"
    },
    "source": "an example set in the video"
  },
  {
    "key": "me161-f3",
    "figure": "/questions/me-161/f3.svg",
    "figureAlt": "500 N force from the origin making 60 degrees with x, 45 degrees with y and 120 degrees with z, so it points slightly downward",
    "unit": "N",
    "video": {
      "youtubeId": "LPyvV4tQZnY",
      "title": "Ep9 Resolution of forces in space Three Dimensional",
      "channel": "Einstein's Mechanics",
      "minutes": 32,
      "part": "Example 1"
    },
    "source": "an example set in the video"
  },
  {
    "key": "me161-f4",
    "figure": "/questions/me-161/f4.svg",
    "figureAlt": "Tower guy wire from anchor bolt A on the ground to the top B of an 80 m tower; B is 40 m back along x and 30 m along z from A. Here y is vertical",
    "unit": "N",
    "video": {
      "youtubeId": "04WxgMrpOxE",
      "title": "Ep10 Complex resolution of forces in space",
      "channel": "Einstein's Mechanics",
      "minutes": 27,
      "part": "Worked example (guy wire)"
    },
    "source": "F. P. Beer and E. R. Johnston, Vector Mechanics for Engineers: Statics, Sample Problem 2.7"
  },
  {
    "key": "me161-f5",
    "figure": "/questions/me-161/f5.svg",
    "figureAlt": "A man at B, 12 ft along x, 8 ft along negative y and 6 ft up, pulls a cord tied to support A, 30 ft up on the z axis, with 70 lb",
    "unit": "°",
    "video": {
      "youtubeId": "gwj7yMpY4RE",
      "title": "Force Vector Along a Line Example",
      "channel": "Calvin Stewart",
      "minutes": null,
      "part": "Whole video"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics, worked example"
  },
  {
    "key": "me161-f6",
    "figure": "/questions/me-161/f6.svg",
    "figureAlt": "Flag pole on the z axis with cables from A, 6 m up, to ground anchors B at x 2 m, y minus 3 m and C at x 3 m, y 2 m",
    "unit": "N",
    "video": {
      "youtubeId": "CCeWy1kmxMs",
      "title": "Force Vectors Along a Line | Mechanics Statics | (Learn to solve any question)",
      "channel": "Question Solutions",
      "minutes": 7,
      "part": "First example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-f7",
    "figure": "/questions/me-161/f7.svg",
    "figureAlt": "A hook A on a wall lying in the x-z plane, 1 m along x from the corner at height z; a 4 m cord runs from A down to point B on the floor at coordinates x, y",
    "unit": "m",
    "video": {
      "youtubeId": "CCeWy1kmxMs",
      "title": "Force Vectors Along a Line | Mechanics Statics | (Learn to solve any question)",
      "channel": "Question Solutions",
      "minutes": 7,
      "part": "Third example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-f8",
    "figure": "/questions/me-161/f8.svg",
    "figureAlt": "Two forces at the origin: F1 of 450 N in the y-z plane pointing down on a 3-4-5 slope, and F2 of 525 N with direction angles 45, 120 and 60 degrees",
    "unit": "N",
    "video": {
      "youtubeId": "d_0NYB_qu9Y",
      "title": "How to Find the Resultant Force for 3D Vectors – Statics 3D Components and Resultants Problem 1",
      "channel": "Professor Engineer",
      "minutes": 16,
      "part": "Whole video"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-f9",
    "figure": "/questions/me-161/f9.svg",
    "figureAlt": "Screw eye at the origin with three cable forces: F1 350 N, F2 100 N and F3 250 N, with their direction angles listed under the figure",
    "unit": "N",
    "video": {
      "youtubeId": "mz7gPpIL0Gk",
      "title": "Addition of Cartesian Vector Forces | Mechanics Statics | (Learn to solve any question step by step)",
      "channel": "Question Solutions",
      "minutes": 10,
      "part": "First example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-f10",
    "figure": "/questions/me-161/f10.svg",
    "figureAlt": "Rod AC from A at height 4 m on the z axis to C on the floor; a 600 N force acts at B, the midpoint of the rod, directed toward point D on the floor",
    "unit": "N",
    "video": {
      "youtubeId": "3E_z_KLjF90",
      "title": "Dot Product and Force Vectors | Mechanics Statics | (Learn to solve any question)",
      "channel": "Question Solutions",
      "minutes": 6,
      "part": "Third example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-f11",
    "figure": "/questions/me-161/f11.svg",
    "figureAlt": "Triangular plate with corners A at (3, 1, 1) m, B at (3, 3, 4) m and C at (6, 5, 0) m; theta is the angle at A between sides AB and AC",
    "unit": "°",
    "video": {
      "youtubeId": "3E_z_KLjF90",
      "title": "Dot Product and Force Vectors | Mechanics Statics | (Learn to solve any question)",
      "channel": "Question Solutions",
      "minutes": 6,
      "part": "First example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-pe1",
    "figure": "/questions/me-161/pe1.svg",
    "figureAlt": "Ring A held by cable AB at 30 degrees to the left and cable AC on a 3-4-5 slope to the right, with a 500 N load D hanging below",
    "unit": "N",
    "video": {
      "youtubeId": "QTGJTUd1fX0",
      "title": "🔺09 - Equilibrium of a Particle 2D - Free Body Diagrams Examples 1 & 2",
      "channel": "SkanCity Academy",
      "minutes": 22,
      "part": "First example"
    },
    "source": "an example set in the video"
  },
  {
    "key": "me161-pe2",
    "figure": "/questions/me-161/pe2.svg",
    "figureAlt": "Ring E with cable ED horizontal to wall D and cable EB at 30 degrees over pulley B to a 40 kg cylinder C; cylinder A hangs from E",
    "unit": "kg",
    "video": {
      "youtubeId": "QTGJTUd1fX0",
      "title": "🔺09 - Equilibrium of a Particle 2D - Free Body Diagrams Examples 1 & 2",
      "channel": "SkanCity Academy",
      "minutes": 22,
      "part": "Second example (F3-5)"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics, fundamental problem F3-5"
  },
  {
    "key": "me161-pe3",
    "figure": "/questions/me-161/pe3.svg",
    "figureAlt": "Two cables AC and BC tied at C; A is 1100 mm left and B 400 mm right of C, both 960 mm above it; a 1600 kg load hangs at C",
    "unit": "kN",
    "video": {
      "youtubeId": "hjzWPQoMotw",
      "title": "🔺10 - Equilibrium of a Particle 2D - Free Body Diagrams Examples 3 & 4",
      "channel": "SkanCity Academy",
      "minutes": 24,
      "part": "First example in this video (example 3)"
    },
    "source": "F. P. Beer and E. R. Johnston, Vector Mechanics for Engineers: Statics"
  },
  {
    "key": "me161-pe4",
    "figure": "/questions/me-161/pe4.svg",
    "figureAlt": "Connection plate: member A pulls at 50 degrees above the horizontal to the left, member B pushes horizontally from the left, P 500 N acts straight down and Q 650 N acts 40 degrees from the vertical down to the right",
    "unit": "N",
    "video": {
      "youtubeId": "hjzWPQoMotw",
      "title": "🔺10 - Equilibrium of a Particle 2D - Free Body Diagrams Examples 3 & 4",
      "channel": "SkanCity Academy",
      "minutes": 24,
      "part": "Second example in this video (example 4)"
    },
    "source": "F. P. Beer and E. R. Johnston, Vector Mechanics for Engineers: Statics"
  },
  {
    "key": "me161-pe5",
    "figure": "/questions/me-161/pe5.svg",
    "figureAlt": "Particle at the origin acted on by F1 in the y-z plane, F2 along the negative x axis, F3 up and back, a 600 N force along x and a 900 N force downward",
    "unit": "N",
    "video": {
      "youtubeId": "wRU-a-CCsSc",
      "title": "🔺12 - Equilibrium of a Particle 3D - Example 1 - Free Body Diagrams",
      "channel": "SkanCity Academy",
      "minutes": 19,
      "part": "Example 1 (F3-7)"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics, fundamental problem F3-7"
  },
  {
    "key": "me161-pe6",
    "figure": "/questions/me-161/pe6.svg",
    "figureAlt": "Cord system: BC horizontal to wall C, BD up to the right on a 3-4-5 slope, AB at 60 degrees from the horizontal at A, AE horizontal to wall E, and a pipe hanging from hook H under A",
    "unit": "kg",
    "video": {
      "youtubeId": "X9g4G1eBHCA",
      "title": "Equilibrium of a Particle (2D x-y plane forces) | Mechanics Statics | (Learn to solve any question)",
      "channel": "Question Solutions",
      "minutes": 10,
      "part": "First example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-pe7",
    "figure": "/questions/me-161/pe7.svg",
    "figureAlt": "Cable ABC, 5 m long, runs from A on the left wall over a small pulley B to C on the right wall, 3.5 m away horizontally and 0.75 m higher than A; a 100 kg sack hangs from the pulley at horizontal distance x from A",
    "unit": "m",
    "video": {
      "youtubeId": "X9g4G1eBHCA",
      "title": "Equilibrium of a Particle (2D x-y plane forces) | Mechanics Statics | (Learn to solve any question)",
      "channel": "Question Solutions",
      "minutes": 10,
      "part": "Third example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-pe8",
    "figure": "/questions/me-161/pe8.svg",
    "figureAlt": "Flowerpot of 20 kg hanging at A from three cables: AB to a wall bracket 6 m up and 3 m back, AC and AD to floor anchors 4 m along y and 2 m either side",
    "unit": "N",
    "video": {
      "youtubeId": "EzquIxEoHRE",
      "title": "Equilibrium of a Particle 3D Force Systems | Mechanics Statics | (Learn to solve any problem)",
      "channel": "Question Solutions",
      "minutes": 7,
      "part": "First example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-pe9",
    "figure": "/questions/me-161/pe9.svg",
    "figureAlt": "Uniform 12 m by 12 m plate hung from ring A, 12 m above its centre, by three cables to points B, C and D on its edges",
    "unit": "kg",
    "video": {
      "youtubeId": "EzquIxEoHRE",
      "title": "Equilibrium of a Particle 3D Force Systems | Mechanics Statics | (Learn to solve any problem)",
      "channel": "Question Solutions",
      "minutes": 7,
      "part": "Third example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-pe10",
    "figure": "/questions/me-161/pe10.svg",
    "figureAlt": "Ring A hangs from the ceiling by cable AB at 50 degrees from the horizontal and cable AC, which runs 4.00 m across and 3.00 m up; a 100 kg mass D hangs from A",
    "unit": "N",
    "video": {
      "youtubeId": "hqpzyCNGH_Y",
      "title": "Statics - 2D equilibrium - particle problems - example",
      "channel": "Thomas Pressly",
      "minutes": 7,
      "part": "Whole video"
    },
    "source": "an example set in the video"
  },
  {
    "key": "me161-m1",
    "figure": "/questions/me-161/m1.svg",
    "figureAlt": "Pipe hanging 0.9 m down from A, then running 0.3 m left to C and 0.7 m right to B; a 70 N force acts at B at 60 degrees above the horizontal",
    "unit": "N·m",
    "video": {
      "youtubeId": "QNNnPZ68STI",
      "title": "Moment of a Force | Mechanics Statics | (Learn to solve any question)",
      "channel": "Question Solutions",
      "minutes": 9,
      "part": "Part-way through the video"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-m2",
    "figure": "/questions/me-161/m2.svg",
    "figureAlt": "Pipe along the x axis from O with two wrenches 200 mm apart: wrench A 600 mm from O with its handle 150 mm toward negative y, wrench B with its handle 150 mm toward positive y; 125 N acts down at A's handle and up at B's handle",
    "unit": "N·m",
    "video": {
      "youtubeId": "uV4QDXd0ARM",
      "title": "Couple Moments | Mechanics Statics | (Learn to solve any question)",
      "channel": "Question Solutions",
      "minutes": 6,
      "part": "Second example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-m3",
    "figure": "/questions/me-161/m3.svg",
    "figureAlt": "Beam fixed to a wall at O: a 450 N force pushes down on the top face 1.5 m from O, tilted 30 degrees from the vertical; a 200 N upward force acts 3.5 m from O; a 200 N m clockwise couple acts at the free end 5 m from O; O is 0.2 m below the top face",
    "unit": "N",
    "video": {
      "youtubeId": "OffvP-cpMnY",
      "title": "Simplification of Forces and Moments | Mechanics Statics | Solved examples",
      "channel": "Question Solutions",
      "minutes": 7,
      "part": "First example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-m4",
    "figure": "/questions/me-161/m4.svg",
    "figureAlt": "Bent bracket fixed at A on the x axis; the force of 450 N acts at the top of post B, 0.15 m along negative x, 0.3 m along y and 0.1 m up from A",
    "unit": "N·m",
    "video": {
      "youtubeId": "rdK0c9YZRYw",
      "title": "Moment About a Specified Axis | Mechanics Statics | (Learn to Solve Any Question)",
      "channel": "Question Solutions",
      "minutes": 7,
      "part": "First example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-t1",
    "figure": "/questions/me-161/t1.svg",
    "figureAlt": "Truss with pin A and roller E on the bottom chord, D 4 m beyond E, top joints B and C 4 m apart; all diagonals at 60 degrees; an 8 kN load hangs at D",
    "unit": "kN",
    "video": {
      "youtubeId": "_rK02neOF18",
      "title": "Trusses Method of Joints | Mechanics Statics | Learn to Solve Questions",
      "channel": "Question Solutions",
      "minutes": 11,
      "part": "First example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-t2",
    "figure": "/questions/me-161/t2.svg",
    "figureAlt": "Rhombus-shaped truss ABCD with 2 m sides and a 120 degree angle at A, diagonal DB, roller at A and pin at B; equal loads P act down at D and C",
    "unit": "kN",
    "video": {
      "youtubeId": "_rK02neOF18",
      "title": "Trusses Method of Joints | Mechanics Statics | Learn to Solve Questions",
      "channel": "Question Solutions",
      "minutes": 11,
      "part": "Third example"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-t3",
    "figure": "/questions/me-161/t3.svg",
    "figureAlt": "Three-member truss against a wall: B is pinned to the wall 3.2 m above C, which rests on a roller against the wall; joint A is 3 m out from the wall and 4 m above B; a 48 kN horizontal load acts to the right at A",
    "unit": "kN",
    "video": {
      "youtubeId": "siWQ6G4dRug",
      "title": "Ep18 Problems on Method of Joints First Set",
      "channel": "Einstein's Mechanics",
      "minutes": 34,
      "part": "Example 1"
    },
    "source": "F. P. Beer and E. R. Johnston, Vector Mechanics for Engineers: Statics"
  },
  {
    "key": "me161-t4",
    "figure": "/questions/me-161/t4.svg",
    "figureAlt": "Truss with pin A, joint B 3 m to the right, roller C a further 1 m, and joint D 4 m above A; members AB, BC, AD, BD and CD; 5 kN acts horizontally to the right at D and 8 kN acts down at B",
    "unit": "kN",
    "video": {
      "youtubeId": "BVCIQfFzguk",
      "title": "Statics: Lesson 48 - Trusses, Method of Joints",
      "channel": "Jeff Hanson",
      "minutes": 17,
      "part": "Whole video"
    },
    "source": "an example set in the video"
  },
  {
    "key": "me161-t5",
    "figure": "/questions/me-161/t5.svg",
    "figureAlt": "Howe truss on a 8 ft span with four 2 ft panels and 2 ft height: bottom joints A, B, D, E, F and top joints I, H, G; loads of 9 kip at B, 4 kip at D and 7 kip at E; pin at A and roller at F",
    "unit": "kip",
    "video": {
      "youtubeId": "n6P8jBcT8ks",
      "title": "Statics: Lesson 49 - Trusses, The Method of Sections",
      "channel": "Jeff Hanson",
      "minutes": 14,
      "part": "Whole video"
    },
    "source": "an example set in the video"
  },
  {
    "key": "me161-z1",
    "figure": "/questions/me-161/z1.svg",
    "figureAlt": "Symmetric roof truss on a pin and a roller with six bottom panels; it has a centre vertical, two verticals and two diagonals on each side; a single load P hangs at the centre of the bottom chord",
    "unit": "",
    "video": {
      "youtubeId": "kq88GGkoepQ",
      "title": "Identify Zero Force Members in Truss Analysis",
      "channel": "INTEGRAL PHYSICS",
      "minutes": 4,
      "part": "Whole video"
    },
    "source": "an example set in the video"
  },
  {
    "key": "me161-fr1",
    "figure": "/questions/me-161/fr1.svg",
    "figureAlt": "A 50 kg block resting on a 15 degree slope; force P pulls on a handle at 20 degrees above the slope surface, up the slope",
    "unit": "N",
    "video": {
      "youtubeId": "GDzy4D9Llsg",
      "title": "Determine the magnitude and direction of the friction force. Chapter 6: Friction | Engineers Academy",
      "channel": "Engineers Academy",
      "minutes": 25,
      "part": "Whole video"
    },
    "source": "J. L. Meriam and L. G. Kraige, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-fr2",
    "figure": "/questions/me-161/fr2.svg",
    "figureAlt": "A 45 kg block pressed against a vertical wall by a 500 N push applied through a rod from below right, at angle theta below the horizontal",
    "unit": "N",
    "video": {
      "youtubeId": "5V2sLjnX9oQ",
      "title": "Determine the magnitude and direction of friction force. Chapter 6: Friction | Engineers Academy",
      "channel": "Engineers Academy",
      "minutes": 10,
      "part": "Whole video"
    },
    "source": "J. L. Meriam and L. G. Kraige, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-fr3",
    "figure": "/questions/me-161/fr3.svg",
    "figureAlt": "A 50 kg block on a horizontal floor pushed by a 200 N force through a rod from the upper left, at angle theta below the horizontal",
    "unit": "",
    "video": {
      "youtubeId": "GOYnS5sujoU",
      "title": "Calculate the coefficient of static friction. | Chapter 6: Friction | Engineers Academy",
      "channel": "Engineers Academy",
      "minutes": 11,
      "part": "Whole video"
    },
    "source": "J. L. Meriam and L. G. Kraige, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-fr4",
    "figure": "/questions/me-161/fr4.svg",
    "figureAlt": "A 24 kg block on a 10 degree slope pulled up the slope by force P; a 20 kg block sits on top of it, held between vertical guides by rollers so it can only move up and down",
    "unit": "N",
    "video": {
      "youtubeId": "E1bSSXNfXCM",
      "title": "Calculate force P required to initiate motion of 24 kg block up. | Friction | Engineers academy",
      "channel": "Engineers Academy",
      "minutes": 16,
      "part": "Whole video"
    },
    "source": "J. L. Meriam and L. G. Kraige, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-fr5",
    "figure": "/questions/me-161/fr5.svg",
    "figureAlt": "A uniform pole AB of length l with end B on the floor and end A against a wall that leans back so it makes 105 degrees with the floor on the pole's side; theta is the angle the pole makes with the floor",
    "unit": "°",
    "video": {
      "youtubeId": "IfmKWv27UTM",
      "title": "Determine minimum angle at which the pole can be placed. | Chapter 6: Friction | Engineers Academy",
      "channel": "Engineers Academy",
      "minutes": 25,
      "part": "Whole video"
    },
    "source": "J. L. Meriam and L. G. Kraige, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-fr6",
    "figure": "/questions/me-161/fr6.svg",
    "figureAlt": "A 200 kg block A sits on a 100 kg crate B on the floor; a horizontal force P pushes on block A",
    "unit": "",
    "video": {
      "youtubeId": "_TKgr_lNBJg",
      "title": "What happen to each body if P=600N. | Chapter 6: Friction | Engineers Academy",
      "channel": "Engineers Academy",
      "minutes": 18,
      "part": "Part (b) of the video"
    },
    "source": "J. L. Meriam and L. G. Kraige, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-fr7",
    "figure": "/questions/me-161/fr7.svg",
    "figureAlt": "A 5 kg block sits on a 10 kg block; a cable from the 5 kg block passes round a pulley fixed to the wall on the left and returns to the 10 kg block; horizontal force P is applied either to the 5 kg block (case a) or to the 10 kg block (case b)",
    "unit": "N",
    "video": {
      "youtubeId": "N5XoofjiV5I",
      "title": "Determine horizontal force P necessary to cause motion. | Chapter 6: Friction | Engineers Academy",
      "channel": "Engineers Academy",
      "minutes": 15,
      "part": "Part (a) of the video"
    },
    "source": "J. L. Meriam and L. G. Kraige, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-fr8",
    "figure": "/questions/me-161/fr8.svg",
    "figureAlt": "A 100 kg block on a 20 degree slope carries a small pulley; a cable anchored at the top passes round it and over the top pulley, then down to a block of mass m that rests on wheels against a face tilted 10 degrees from the vertical",
    "unit": "kg",
    "video": {
      "youtubeId": "SB_q4cmRc9k",
      "title": "Determine range of mass m for which 100kg block is in equilibrium | Friction | Engineers Academy",
      "channel": "Engineers Academy",
      "minutes": 14,
      "part": "Whole video"
    },
    "source": "J. L. Meriam and L. G. Kraige, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-fr9",
    "figure": "/questions/me-161/fr9.svg",
    "figureAlt": "A uniform 150 lb crate, 2 ft wide and 3 ft tall, on the floor; a horizontal force P pushes on its top edge",
    "unit": "lb",
    "video": {
      "youtubeId": "yV3002RdUXs",
      "title": "Statics: Sliding versus Tipping Example",
      "channel": "Mechanical Engineering with Dr. Sanei",
      "minutes": 8,
      "part": "Whole video"
    },
    "source": "R. C. Hibbeler, Engineering Mechanics: Statics, problem 8-32"
  },
  {
    "key": "me161-fr10",
    "figure": "/questions/me-161/fr10.svg",
    "figureAlt": "Two identical 150 lb boxes, each 3 ft wide and 4.5 ft tall, stacked on the floor; a horizontal force P pushes on the upper box 5 ft above the floor",
    "unit": "lb",
    "video": {
      "youtubeId": "IXbIYBtJWNc",
      "title": "Statics: Lesson 63 - Friction Slipping Tipping Problem",
      "channel": "Jeff Hanson",
      "minutes": 10,
      "part": "Whole video"
    },
    "source": "an example set in the video"
  },
  {
    "key": "me161-fr11",
    "figure": "/questions/me-161/fr11.svg",
    "figureAlt": "A uniform bar AB of mass m and length l leans with end A on a vertical wall and end B on the floor, at 25 degrees to the wall; a horizontal force P acts at B, either to the right (a) or to the left (b)",
    "unit": "× mg",
    "video": {
      "youtubeId": "BbFSyLC56Zo",
      "title": "Determine the force P which causes impending slip. | Chapter 6: Friction | Engineers Academy",
      "channel": "Engineers Academy",
      "minutes": 15,
      "part": "Part (a) of the video"
    },
    "source": "J. L. Meriam and L. G. Kraige, Engineering Mechanics: Statics"
  },
  {
    "key": "me161-fr12",
    "figure": "/questions/me-161/fr12.svg",
    "figureAlt": "A 100 kg crate is slid up a 30 degree slope: one man pushes it horizontally with 500 N from below, the other pulls a rope at 15 degrees above the slope with tension T",
    "unit": "N",
    "video": {
      "youtubeId": "5zzi0m9SW18",
      "title": "Determine the tension T which the upper man must exert. Chapter 6: Friction | Engineers Academy",
      "channel": "Engineers Academy",
      "minutes": 11,
      "part": "Whole video"
    },
    "source": "J. L. Meriam and L. G. Kraige, Engineering Mechanics: Statics"
  }
];

const BY_KEY = new Map(SOLUTIONS.map((solution) => [solution.key, solution]));

export function getVideoSolution(tags: string[] | undefined): VideoSolution | undefined {
  const tag = tags?.find((entry) => entry.startsWith("media:"));
  return tag ? BY_KEY.get(tag.slice("media:".length)) : undefined;
}
