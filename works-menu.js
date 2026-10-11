// 「作品 / Works」下拉菜单
// 1) 作品列表会自动从 index.html 里读取(首页里每个作品的标题和链接),
//    所以以后你在首页增删作品,这个菜单会自动跟着更新。
// 2) 「胶冻小组」是一个二级菜单:它会读取 thejellytroupe.html 里「相关作品」列表(.related-works)
//    的所有链接,把这些作品收进去,不再和其他作品平铺在一起。
(function () {
  const holder = document.getElementById('works-menu');
  if (!holder) return;

  const LABEL = '作品 / Works';

  // 胶冻小组的页面文件名(如果以后改了文件名,改这里)
  const GROUP_PAGE = 'thejellytroupe.html';
  // 万一首页里没读到这个条目时,二级菜单标题用这两个名字
  const GROUP_FALLBACK_CN = '胶冻小组';
  const GROUP_FALLBACK_EN = 'The Jelly Troupe';

  // ---------- 按钮和下拉面板 ----------
  const button = document.createElement('button');
  button.className = 'works-toggle';
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.textContent = LABEL + ' ▾';

  const panel = document.createElement('div');
  panel.className = 'works-panel';
  panel.textContent = '加载中…';

  holder.appendChild(button);
  holder.appendChild(panel);

  function setOpen(open) {
    holder.classList.toggle('open', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.textContent = LABEL + (open ? ' ▴' : ' ▾');
  }

  button.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!holder.classList.contains('open'));
  });
  document.addEventListener('click', function (e) {
    if (!holder.contains(e.target)) setOpen(false);   // 点菜单外面就收起
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  // ---------- 工具函数 ----------
  function textOf(el) {
    if (!el) return '';
    const copy = el.cloneNode(true);
    copy.querySelectorAll('br').forEach(function (br) { br.replaceWith(' '); });
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  function pageName(path) {
    return path.split('#')[0].split('?')[0].split('/').pop().replace(/\.html$/, '');
  }

  const here = pageName(location.pathname);
  const groupKey = pageName(GROUP_PAGE);

  function loadDoc(url) {
    return fetch(new URL(url, location.href))
      .then(function (res) {
        if (!res.ok) throw new Error(url + ' 读取失败');
        return res.text();
      })
      .then(function (html) {
        return new DOMParser().parseFromString(html, 'text/html');
      });
  }

  function collect(root) {
    const items = [];
    root.querySelectorAll('.work-item').forEach(function (el) {
      const a = el.querySelector('a');
      if (!a || !a.getAttribute('href')) return;
      items.push({
        href: a.getAttribute('href'),
        cn: textOf(el.querySelector('.title-cn')),
        en: textOf(el.querySelector('.title-en'))
      });
    });
    return items;
  }

  // 读首页,得到 [{title: '2025 - 2026', items: [...]}, ...]
  function readIndex(doc) {
    const groups = [];
    const blocks = doc.querySelectorAll('.year-block');
    if (blocks.length) {
      blocks.forEach(function (block) {
        const items = collect(block);
        if (items.length) groups.push({ title: textOf(block.querySelector('.year-title')), items: items });
      });
    } else {
      const items = collect(doc);
      if (items.length) groups.push({ title: '', items: items });
    }
    return groups;
  }

  // 读胶冻小组页面里的「相关作品」列表
  function readMembers(doc, yearGroups) {
    if (!doc) return [];
    const known = {};
    yearGroups.forEach(function (g) {
      g.items.forEach(function (item) { known[pageName(item.href)] = item; });
    });
    const members = [];
    const seen = {};
    doc.querySelectorAll('.related-works a').forEach(function (a) {
      const href = a.getAttribute('href');
      if (!href) return;
      const key = pageName(href);
      if (key === groupKey || seen[key]) return;
      seen[key] = true;
      if (known[key]) {
        members.push(known[key]);              // 首页里有,就用首页里的中英文标题
      } else {
        const parts = textOf(a).split(' / ');  // 首页里没有,就用这个链接自己的文字(「中文 / English」)
        members.push({ href: href, cn: parts[0], en: parts.slice(1).join(' / ') });
      }
    });
    return members;
  }

  // ---------- 生成菜单内容 ----------
  function buildLink(item, extraClass) {
    const a = document.createElement('a');
    a.href = item.href;
    if (pageName(item.href) === here) a.className = 'current';
    if (extraClass) a.className += (a.className ? ' ' : '') + extraClass;
    const main = document.createElement('span');
    main.className = 'w-cn';
    main.textContent = item.cn || item.en;
    a.appendChild(main);
    if (item.cn && item.en) {
      const sub = document.createElement('span');
      sub.className = 'w-en';
      sub.textContent = item.en;
      a.appendChild(sub);
    }
    return a;
  }

  function buildGroup(parentItem, members) {
    const wrap = document.createElement('div');
    wrap.className = 'works-group';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'works-group-toggle';
    const label = document.createElement('span');
    const cn = document.createElement('span');
    cn.className = 'w-cn';
    cn.textContent = parentItem.cn || GROUP_FALLBACK_CN;
    label.appendChild(cn);
    const enText = parentItem.cn ? parentItem.en : (parentItem.en || GROUP_FALLBACK_EN);
    if (enText) {
      const en = document.createElement('span');
      en.className = 'w-en';
      en.textContent = enText;
      label.appendChild(en);
    }
    toggle.appendChild(label);

    const sub = document.createElement('div');
    sub.className = 'works-sub';
    sub.appendChild(buildLink({ href: GROUP_PAGE, cn: '总览 / Overview', en: '' }, 'works-overview'));
    members.forEach(function (m) { sub.appendChild(buildLink(m)); });

    wrap.appendChild(toggle);
    wrap.appendChild(sub);

    // 如果当前就在胶冻小组的某个作品页,默认把二级菜单展开
    const inGroup = here === groupKey || members.some(function (m) { return pageName(m.href) === here; });
    if (inGroup) wrap.classList.add('open');
    toggle.setAttribute('aria-expanded', inGroup ? 'true' : 'false');

    toggle.addEventListener('click', function () {
      const open = wrap.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    return wrap;
  }

  function showNote(message) {
    panel.textContent = '';
    const p = document.createElement('p');
    p.className = 'works-note';
    p.textContent = message + ' ';
    const a = document.createElement('a');
    a.href = 'index.html';
    a.textContent = '去首页看全部作品';
    p.appendChild(a);
    panel.appendChild(p);
  }

  function render(yearGroups, members) {
    panel.textContent = '';
    const hasGroup = members.length > 0;
    const memberKeys = {};
    members.forEach(function (m) { memberKeys[pageName(m.href)] = true; });
    let groupDrawn = false;

    yearGroups.forEach(function (g) {
      const nodes = [];
      g.items.forEach(function (item) {
        const key = pageName(item.href);
        if (hasGroup && key === groupKey) {
          nodes.push(buildGroup(item, members));
          groupDrawn = true;
        } else if (hasGroup && memberKeys[key]) {
          return;                                  // 已经收进二级菜单了,这里不再重复显示
        } else {
          nodes.push(buildLink(item));
        }
      });
      if (nodes.length === 0) return;
      if (g.title) {
        const h = document.createElement('div');
        h.className = 'works-year';
        h.textContent = g.title;
        panel.appendChild(h);
      }
      nodes.forEach(function (n) { panel.appendChild(n); });
    });

    // 首页里没有「胶冻小组」这一项时,把二级菜单放在最上面
    if (hasGroup && !groupDrawn) {
      panel.insertBefore(buildGroup({ cn: '', en: '' }, members), panel.firstChild);
    }
  }

  // ---------- 读取数据并显示 ----------
  Promise.all([
    loadDoc('index.html'),
    loadDoc(GROUP_PAGE).catch(function () { return null; })   // 读不到胶冻小组页面也没关系,就不分二级
  ])
    .then(function (docs) {
      const yearGroups = readIndex(docs[0]);
      if (yearGroups.length === 0) { showNote('暂时没有读到作品列表。'); return; }
      render(yearGroups, readMembers(docs[1], yearGroups));
    })
    .catch(function () {
      showNote('作品列表暂时无法加载。');
    });
})();
