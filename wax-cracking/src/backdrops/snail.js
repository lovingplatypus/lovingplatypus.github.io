import './snail.css';

// Decorations for the snail stage: a tiny garden just after the rain.
// Rendered inside .toy-scene[data-scene=snail], which only shows while the
// snail squishy is picked. Purely visual. Pixel sprites are generated from
// small ASCII grids (one path per colour, crispEdges).
const shrooms = '<svg class="snail-shrooms" viewBox="0 0 22 13" shape-rendering="crispEdges"><path fill="#f4a99d" d="M4 0h6v1h-6zM2 1h3v1h-3zM7 1h5v1h-5zM1 2h4v1h-4zM7 2h3v1h-3zM11 2h2v1h-2zM0 3h10v1h-10zM12 3h2v1h-2zM0 4h2v1h-2zM4 4h10v1h-10zM17 4h3v1h-3zM0 5h2v1h-2zM4 5h5v1h-5zM11 5h3v1h-3zM16 5h2v1h-2zM19 5h2v1h-2zM1 6h8v1h-8zM11 6h2v1h-2zM15 6h7v1h-7z"/><path fill="#fff8ee" d="M5 1h2v1h-2zM5 2h2v1h-2zM10 2h1v1h-1zM10 3h2v1h-2zM2 4h2v1h-2zM2 5h2v1h-2zM9 5h2v1h-2zM18 5h1v1h-1zM9 6h2v1h-2zM4 8h5v1h-5zM17 8h2v1h-2zM4 9h5v1h-5zM17 9h2v1h-2zM4 10h5v1h-5zM17 10h2v1h-2zM4 11h5v1h-5zM17 11h2v1h-2zM3 12h6v1h-6zM16 12h3v1h-3z"/><path fill="#df8c84" d="M0 6h1v1h-1zM13 6h1v1h-1zM1 7h12v1h-12zM15 7h7v1h-7z"/><path fill="#ead6bf" d="M9 8h1v1h-1zM19 8h1v1h-1zM9 9h1v1h-1zM19 9h1v1h-1zM9 10h1v1h-1zM19 10h1v1h-1zM9 11h1v1h-1zM19 11h1v1h-1zM9 12h2v1h-2zM19 12h2v1h-2z"/></svg>';
const tuft = '<svg class="snail-tuft" viewBox="0 0 13 10" shape-rendering="crispEdges"><path fill="#a8cf98" d="M6 0h1v1h-1zM2 1h1v1h-1zM6 1h1v1h-1zM10 1h1v1h-1zM2 2h1v1h-1zM5 2h1v1h-1zM9 2h1v1h-1zM3 3h1v1h-1zM5 3h1v1h-1zM8 3h1v1h-1zM3 4h1v1h-1zM5 4h1v1h-1zM8 4h1v1h-1zM11 4h1v1h-1zM0 5h1v1h-1zM3 5h1v1h-1zM5 5h1v1h-1zM8 5h1v1h-1zM10 5h2v1h-2zM0 6h2v1h-2zM3 6h1v1h-1zM5 6h1v1h-1zM8 6h1v1h-1zM10 6h1v1h-1zM1 7h3v1h-3zM5 7h1v1h-1zM8 7h1v1h-1zM10 7h1v1h-1zM1 8h2v1h-2zM5 8h1v1h-1zM10 8h1v1h-1zM0 9h3v1h-3zM10 9h3v1h-3z"/><path fill="#86b680" d="M6 2h1v1h-1zM6 3h1v1h-1zM4 4h1v1h-1zM6 4h2v1h-2zM4 5h1v1h-1zM6 5h2v1h-2zM4 6h1v1h-1zM6 6h2v1h-2zM9 6h1v1h-1zM4 7h1v1h-1zM6 7h2v1h-2zM9 7h1v1h-1zM3 8h2v1h-2zM6 8h4v1h-4zM3 9h7v1h-7z"/></svg>';
const clover = '<svg class="snail-clover" viewBox="0 0 11 11" shape-rendering="crispEdges"><path fill="#9ccc9a" d="M2 0h3v1h-3zM6 0h3v1h-3zM2 1h7v1h-7zM3 2h2v1h-2zM6 2h2v1h-2zM0 3h2v1h-2zM4 3h3v1h-3zM9 3h2v1h-2zM0 4h4v1h-4zM5 4h1v1h-1zM7 4h4v1h-4zM1 5h1v1h-1zM3 5h2v1h-2zM6 5h2v1h-2zM9 5h1v1h-1zM0 6h4v1h-4zM7 6h4v1h-4zM0 7h2v1h-2zM9 7h2v1h-2z"/><path fill="#cfe6bd" d="M5 2h1v1h-1zM2 5h1v1h-1zM8 5h1v1h-1z"/><path fill="#7fb282" d="M5 5h1v1h-1zM5 6h1v1h-1zM5 7h1v1h-1zM5 8h1v1h-1zM6 9h1v1h-1zM6 10h1v1h-1z"/></svg>';
const daisy = '<svg class="snail-daisy" viewBox="0 0 11 22" shape-rendering="crispEdges"><path fill="#ffffff" d="M4 0h3v1h-3zM1 1h2v1h-2zM4 1h3v1h-3zM8 1h2v1h-2zM1 2h3v1h-3zM5 2h1v1h-1zM7 2h3v1h-3zM2 3h2v1h-2zM7 3h2v1h-2zM0 4h3v1h-3zM8 4h3v1h-3zM0 5h4v1h-4zM7 5h4v1h-4zM2 6h2v1h-2zM5 6h1v1h-1zM7 6h2v1h-2zM1 7h9v1h-9zM1 8h2v1h-2zM4 8h3v1h-3zM8 8h2v1h-2zM4 9h3v1h-3z"/><path fill="#dcd7ec" d="M4 2h1v1h-1zM6 2h1v1h-1zM3 4h1v1h-1zM7 4h1v1h-1zM4 6h1v1h-1zM6 6h1v1h-1z"/><path fill="#f8d77a" d="M4 3h3v1h-3zM4 4h2v1h-2zM4 5h1v1h-1z"/><path fill="#e8b95a" d="M6 4h1v1h-1zM5 5h2v1h-2z"/><path fill="#86b680" d="M5 10h1v1h-1zM5 11h1v1h-1zM5 12h1v1h-1zM5 13h1v1h-1zM5 14h2v1h-2zM5 15h1v1h-1zM4 16h2v1h-2zM4 17h1v1h-1zM5 18h1v1h-1zM5 19h1v1h-1zM5 20h1v1h-1zM4 21h2v1h-2z"/><path fill="#a8cf98" d="M7 12h2v1h-2zM6 13h4v1h-4zM2 14h2v1h-2zM7 14h2v1h-2zM1 15h4v1h-4zM1 16h3v1h-3zM2 17h2v1h-2z"/><path fill="#cfe6bd" d="M10 13h1v1h-1zM0 16h1v1h-1z"/></svg>';
const leaf = '<svg class="snail-leaf" viewBox="0 0 18 7" shape-rendering="crispEdges"><path fill="#cfe6bd" d="M5 0h7v1h-7zM2 1h2v1h-2zM13 1h2v1h-2zM1 2h1v1h-1zM16 2h1v1h-1z"/><path fill="#a8cf98" d="M4 1h9v1h-9zM2 2h14v1h-14zM1 4h16v1h-16zM2 5h13v1h-13zM5 6h7v1h-7z"/><path fill="#86b680" d="M0 3h18v1h-18z"/></svg>';
const bug = '<svg class="snail-bug" viewBox="0 0 7 5" shape-rendering="crispEdges"><path fill="#5f4d52" d="M2 0h3v1h-3zM3 1h1v1h-1zM1 2h1v1h-1zM3 2h1v1h-1zM5 2h1v1h-1zM3 3h1v1h-1zM3 4h1v1h-1z"/><path fill="#ec7a72" d="M1 1h2v1h-2zM4 1h2v1h-2zM0 2h1v1h-1zM2 2h1v1h-1zM4 2h1v1h-1zM6 2h1v1h-1zM0 3h3v1h-3zM4 3h3v1h-3zM1 4h2v1h-2zM4 4h2v1h-2z"/></svg>';
const fly = '<svg class="snail-fly" viewBox="0 0 9 8" shape-rendering="crispEdges"><path fill="#5f4d52" d="M3 0h1v1h-1zM5 0h1v1h-1zM4 1h1v1h-1zM4 2h1v1h-1zM4 3h1v1h-1zM4 4h1v1h-1zM4 5h1v1h-1z"/><path fill="#c9b5e6" d="M1 1h2v1h-2zM6 1h2v1h-2zM0 2h4v1h-4zM5 2h4v1h-4zM0 3h1v1h-1zM2 3h2v1h-2zM5 3h2v1h-2zM8 3h1v1h-1zM1 4h2v1h-2zM6 4h2v1h-2zM2 5h1v1h-1zM6 5h1v1h-1zM1 6h3v1h-3zM5 6h3v1h-3zM1 7h2v1h-2zM6 7h2v1h-2z"/><path fill="#fff4fb" d="M1 3h1v1h-1zM7 3h1v1h-1z"/><path fill="#a993d0" d="M3 4h1v1h-1zM5 4h1v1h-1zM3 5h1v1h-1zM5 5h1v1h-1z"/></svg>';
const cloud = '<svg class="snail-cloud" viewBox="0 0 26 8" shape-rendering="crispEdges"><path fill="#fffdf8" d="M10 0h4v1h-4zM4 1h3v1h-3zM9 1h6v1h-6zM3 2h14v1h-14zM18 2h3v1h-3zM2 3h21v1h-21zM1 4h23v1h-23zM0 5h26v1h-26zM0 6h26v1h-26z"/><path fill="#e2ecf4" d="M1 7h24v1h-24z"/></svg>';
const drop = '<svg class="snail-drop" viewBox="0 0 4 6" shape-rendering="crispEdges"><path fill="#94c6e0" d="M1 0h1v1h-1zM1 1h1v1h-1zM0 2h1v1h-1zM3 2h1v1h-1zM0 3h1v1h-1zM3 3h1v1h-1zM0 4h1v1h-1zM3 4h1v1h-1zM1 5h2v1h-2z"/><path fill="#c4e3f2" d="M2 1h1v1h-1zM1 2h2v1h-2zM2 3h1v1h-1zM2 4h1v1h-1z"/><path fill="#ffffff" d="M1 3h1v1h-1zM1 4h1v1h-1z"/></svg>';
const dew = '<svg class="snail-dew" viewBox="0 0 3 3" shape-rendering="crispEdges"><path fill="#94c6e0" d="M1 0h1v1h-1zM0 1h1v1h-1zM2 1h1v1h-1zM1 2h1v1h-1z"/><path fill="#ffffff" d="M1 1h1v1h-1z"/></svg>';
const glint = '<svg class="snail-glint" viewBox="0 0 5 5" shape-rendering="crispEdges"><path fill="#fff" d="M2 0h1v2h2v1H3v2H2V3H0V2h2z"/></svg>';

export default {
  id: 'snail',
  html: `
    <div class="snail-rainbow"></div>
    <div class="snail-hills"></div>
    <span class="snail-cloud-wrap snail-cloud-a">${cloud}</span>
    <span class="snail-cloud-wrap snail-cloud-b">${cloud}</span>
    <span class="snail-cloud-wrap snail-cloud-c">${cloud}</span>
    <div class="snail-trail"></div>
    <span class="snail-trail-spark snail-ts1">${glint}</span><span class="snail-trail-spark snail-ts2">${glint}</span><span class="snail-trail-spark snail-ts3">${glint}</span><span class="snail-trail-spark snail-ts4">${glint}</span>
    <div class="snail-puddle"><i class="snail-ripple"></i></div>
    <span class="snail-rain">${drop}</span>
    <span class="snail-fly-path"><span class="snail-fly-wrap">${fly}</span></span>
    <span class="snail-prop snail-tuft-l">${tuft}</span>
    <span class="snail-prop snail-shroom-wrap">${shrooms}</span>
    <span class="snail-prop snail-clover-l">${clover}</span>
    <span class="snail-prop snail-daisy-wrap">${daisy}</span>
    <span class="snail-prop snail-leaf-wrap">${leaf}<span class="snail-bug-wrap">${bug}</span></span>
    <span class="snail-prop snail-tuft-r">${tuft}</span>
    <span class="snail-prop snail-clover-r">${clover}</span>
    <span class="snail-dew-wrap snail-dew1">${dew}</span><span class="snail-dew-wrap snail-dew2">${dew}</span><span class="snail-dew-wrap snail-dew3">${dew}</span><span class="snail-dew-wrap snail-dew4">${dew}</span>
  `,
};
