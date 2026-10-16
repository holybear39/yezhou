// 首页「胶冻小组」点开式盒子
// 点击首页上的「胶冻小组」,不跳转,而是在下面展开一个盒子,里面放着属于胶冻小组的所有作品;
// 盒子最上面有一条「简介」,点它才会去 thejellytroupe.html。
//
// 哪些作品属于胶冻小组?读取 thejellytroupe.html 里的「相关作品」列表(.related-works),
// 和顶部「作品 / Works」下拉菜单用的是同一份名单,所以你只需要维护那一份。
// 读取失败时(比如网络问题),「胶冻小组」会保持普通链接的样子,点击直接进入 thejellytroupe.html。
(function () {
  const item = document.querySelector('.work-item.is-group');
  if (!item) return;

  const grid = item.parentElement;
  const SOURCE = item.getAttribute('data-source') || 'thejellytroupe.html';
  const groupKey = pageName(SOURCE);

  // 盒子顶部「简介」链接的文字
  const INTRO_TEXT = '胶冻小组简介 / Intro to The Jelly Troupe →';
  const CLOSE_TEXT = '收起 / Close ▴';

  // ---------- 工具函数 ----------
  function pageName(path) {
    return path.split('#')[0].split('?')[0].split('/').pop().replace(/\.html$/, '');
  }

  function textOf(el) {
    if (!el) return '';
    const copy = el.cloneNode(true);
    copy.querySelectorAll('br').forEach(function (br) { br.replaceWith(' '); });
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  // 去掉空格和标点后的标题,用来判断两条是不是同一个作品(文件名对不上时也能认出来)
  function titleKey(cn, en) {
    const t = (cn || en || '').toLowerCase();
    return t.replace(/[\s\u3000，,。.．·・、:：;；!！?？"'“”‘’()（）\-—_/／]/g, '');
  }

  function elHref(el) {
    const a = el.querySelector('a');
    return a ? (a.getAttribute('href') || '') : '';
  }

  function elTitleKey(el) {
    return titleKey(textOf(el.querySelector('.title-cn')), textOf(el.querySelector('.title-en')));
  }

  function makeItem(href, cn, en) {
    const wrap = document.createElement('div');
    wrap.className = 'work-item';
    function line(cls, text) {
      const p = document.createElement('p');
      p.className = cls;
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      p.appendChild(a);
      return p;
    }
    wrap.appendChild(line('title-cn', cn || en));
    if (cn && en) wrap.appendChild(line('title-en', en));
    return wrap;
  }

  // ---------- 读取名单并生成盒子 ----------
  fetch(new URL(SOURCE, location.href))
    .then(function (res) {
      if (!res.ok) throw new Error(SOURCE + ' 读取失败');
      return res.text();
    })
    .then(function (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const links = Array.prototype.slice.call(doc.querySelectorAll('.related-works a'));
      if (links.length === 0) return;
      build(links);
    })
    .catch(function () { /* 读取失败就保持原样 */ });

  function build(links) {
    // 首页上现有的所有作品条目(除了「胶冻小组」自己),按文件名和标题建索引
    const byHref = {};
    const byTitle = {};
    Array.prototype.forEach.call(document.querySelectorAll('.work-item'), function (el) {
      if (el === item) return;
      const hk = pageName(elHref(el));
      const tk = elTitleKey(el);
      if (hk && !byHref[hk]) byHref[hk] = el;
      if (tk && !byTitle[tk]) byTitle[tk] = el;
    });

    const members = [];
    const usedHref = {};
    const usedTitle = {};

    links.forEach(function (a) {
      const href = a.getAttribute('href');
      if (!href) return;
      const key = pageName(href);
      if (key === groupKey || usedHref[key]) return;

      const parts = textOf(a).split(' / ');
      const cn = parts[0];
      const en = parts.slice(1).join(' / ');
      const tk = titleKey(cn, en);

      let el = byHref[key] || (tk && byTitle[tk]) || null;   // 首页里已经有这个作品吗?
      const finalKey = el ? pageName(elHref(el)) : key;
      const finalTitle = el ? elTitleKey(el) : tk;
      if (usedHref[finalKey] || (finalTitle && usedTitle[finalTitle])) return;

      usedHref[key] = true;
      usedHref[finalKey] = true;
      if (finalTitle) usedTitle[finalTitle] = true;
      members.push(el || makeItem(href, cn, en));            // 首页里没有的,就按这条链接新建一个条目
    });

    if (members.length === 0) return;

    // 盒子:顶部是「简介」,下面是所有作品
    const box = document.createElement('div');
    box.className = 'group-box';
    box.id = 'group-box-' + groupKey;

    const head = document.createElement('div');
    head.className = 'group-box-head';
    const intro = document.createElement('a');
    intro.className = 'group-intro';
    intro.href = SOURCE;
    intro.textContent = INTRO_TEXT;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'group-close';
    close.textContent = CLOSE_TEXT;
    head.appendChild(intro);
    head.appendChild(close);

    const inner = document.createElement('div');
    inner.className = 'works-grid';
    members.forEach(function (el) { inner.appendChild(el); });   // 把首页里原来的条目搬进盒子

    box.appendChild(head);
    box.appendChild(inner);
    item.insertAdjacentElement('afterend', box);

    grid.classList.add('has-group');
    item.classList.add('group-ready');

    // 点「胶冻小组」:展开/收起盒子,不再跳转
    function setOpen(open) {
      box.classList.toggle('open', open);
      item.classList.toggle('open', open);
      Array.prototype.forEach.call(item.querySelectorAll('a'), function (a) {
        a.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    Array.prototype.forEach.call(item.querySelectorAll('a'), function (a) {
      a.setAttribute('role', 'button');
      a.setAttribute('aria-controls', box.id);
      a.setAttribute('aria-expanded', 'false');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        setOpen(!box.classList.contains('open'));
      });
    });

    close.addEventListener('click', function () { setOpen(false); });
  }
})();
