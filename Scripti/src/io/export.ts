// Exporting drafts and setting cover images.
import { App, save } from '../state';
import { toast } from '../utils';
import { render } from '../views/workspace';

export function exportTxt() {
  const d = App.P.drafts[App.dr];
  let t = '';
  if (App.P.type == 'novel') {
    const x = document.createElement('div');
    x.innerHTML = d.novel;
    x.querySelectorAll('p,h1,h2,div').forEach((e?: any) => e.append('\n'));
    t = x.textContent;
  } else {
    const ind = {
      character: ' '.repeat(22),
      dialogue: ' '.repeat(10),
      parenthetical: ' '.repeat(16),
      transition: ' '.repeat(50),
    };
    t = d.blocks
      .map((b?: any) => {
        const x = ['scene', 'character', 'transition'].includes(b.t) ? b.x.toUpperCase() : b.x;
        const pre = ind[b.t] || '';
        return (
          (b.t == 'scene' ? '\n' : '') +
          x
            .split('\n')
            .map((l?: any) => pre + l)
            .join('\n') +
          (['character', 'parenthetical'].includes(b.t) ? '' : '\n')
        );
      })
      .join('\n');
  }
  const name = `${App.P.title} - ${d.name}.txt`.replace(/[\\/:*?"<>|]/g, '-');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Exported ' + name);
}

export function coverImg(f?: any) {
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = 300;
      c.height = 400;
      const x = c.getContext('2d'),
        s = Math.max(300 / im.width, 400 / im.height);
      x.drawImage(im, (300 - im.width * s) / 2, (400 - im.height * s) / 2, im.width * s, im.height * s);
      App.P.img = c.toDataURL('image/jpeg', 0.78);
      save();
      render();
      toast('Cover updated');
    };
    im.src = r.result as string;
  };
  r.readAsDataURL(f);
}
