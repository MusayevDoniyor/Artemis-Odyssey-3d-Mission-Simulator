import { SCENE_CATALOG } from '../qa/scenes';

console.log('Total scenes in catalog:', SCENE_CATALOG.length);
SCENE_CATALOG.forEach((s, i) => {
  console.log(`${i + 1}. [${s.category}] id="${s.id}", sceneId="${s.sceneId}", params=${JSON.stringify(s.params || {})}`);
});
