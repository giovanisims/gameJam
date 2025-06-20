// Polyfill for requestAnimationFrame compatibility
window.requestAnimationFrame = window.requestAnimationFrame ||
                             window.webkitRequestAnimationFrame ||
                             window.mozRequestAnimationFrame ||
                             window.oRequestAnimationFrame ||
                             window.msRequestAnimationFrame ||
                             function(callback) {
                                 window.setTimeout(callback, 1000 / 60);
                             };
