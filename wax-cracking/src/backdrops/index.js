// One little stage per squishy. Each file owns its markup and CSS; everything
// is scoped to .play-area[data-toy=<id>] so the scenes never touch each other.
import butter from './butter.js';
import platypus from './platypus.js';
import lychee from './lychee.js';
import mangosteen from './mangosteen.js';
import chocolate from './chocolate.js';
import snail from './snail.js';
import teddy from './teddy.js';

export const BACKDROPS = [butter, platypus, lychee, mangosteen, chocolate, snail, teddy];
