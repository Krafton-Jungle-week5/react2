import {
  diffTrees,
  domNodeToVNodeTree,
  mountVNode,
  patchDom,
  parseHtmlToVNode,
  serializeVNodeToHtml,
} from '../src/lib/vdom.js';

function normalizeHtml(html) {
  return html.replace(/\s+</g, '<').replace(/>\s+/g, '>').trim();
}

describe('Virtual DOM diff and patch engine', () => {
  it('converts DOM into a normalized virtual tree', () => {
    const tree = parseHtmlToVNode(`
      <section>
        <h1>Hello</h1>
        <p>World</p>
      </section>
    `);

    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].tag).toBe('section');
    expect(tree.children[0].children).toHaveLength(2);
    expect(tree.children[0].children[0].tag).toBe('h1');
    expect(tree.children[0].children[1].tag).toBe('p');
  });

  it('creates prop, text, and insertion operations during diffing', () => {
    const previousTree = parseHtmlToVNode(`
      <div class="before">
        <p>old text</p>
      </div>
    `);
    const nextTree = parseHtmlToVNode(`
      <div class="after" data-state="ready">
        <p>new text</p>
        <span>added</span>
      </div>
    `);

    const operations = diffTrees(previousTree, nextTree);
    const types = operations.map((operation) => operation.type);

    expect(types).toContain('UPDATE_PROPS');
    expect(types).toContain('UPDATE_TEXT');
    expect(types).toContain('INSERT_CHILD');
  });

  it('uses move operations for keyed child reordering', () => {
    const previousTree = parseHtmlToVNode(`
      <ul>
        <li data-key="a">A</li>
        <li data-key="b">B</li>
        <li data-key="c">C</li>
      </ul>
    `);
    const nextTree = parseHtmlToVNode(`
      <ul>
        <li data-key="c">C</li>
        <li data-key="a">A</li>
        <li data-key="b">B</li>
      </ul>
    `);

    const operations = diffTrees(previousTree, nextTree);

    expect(operations.some((operation) => operation.type === 'MOVE_CHILD')).toBe(true);
  });

  it('patches the DOM so it matches the next tree', () => {
    const container = document.createElement('div');
    const previousTree = parseHtmlToVNode(`
      <div class="before">
        <p>old text</p>
      </div>
    `);
    const nextTree = parseHtmlToVNode(`
      <div class="after" data-state="ready">
        <p>new text</p>
        <span>added</span>
      </div>
    `);

    mountVNode(container, previousTree);
    patchDom(container, previousTree, nextTree);

    expect(normalizeHtml(container.innerHTML)).toBe(
      normalizeHtml(serializeVNodeToHtml(nextTree)),
    );
  });

  it('patches keyed child moves so actual DOM matches the next tree', () => {
    const container = document.createElement('div');
    const previousTree = parseHtmlToVNode(`
      <ul>
        <li data-key="a">A</li>
        <li data-key="b">B</li>
        <li data-key="c">C</li>
      </ul>
    `);
    const nextTree = parseHtmlToVNode(`
      <ul>
        <li data-key="c">C</li>
        <li data-key="a">A</li>
        <li data-key="b">B</li>
      </ul>
    `);

    mountVNode(container, previousTree);
    patchDom(container, previousTree, nextTree);

    expect(normalizeHtml(container.innerHTML)).toBe(
      normalizeHtml(serializeVNodeToHtml(nextTree)),
    );
  });

  it('removes nodes that disappear from the next tree', () => {
    const container = document.createElement('div');
    const previousTree = parseHtmlToVNode(`
      <ul>
        <li data-key="a">A</li>
        <li data-key="b">B</li>
      </ul>
    `);
    const nextTree = parseHtmlToVNode(`
      <ul>
        <li data-key="a">A</li>
      </ul>
    `);

    mountVNode(container, previousTree);
    patchDom(container, previousTree, nextTree);

    expect(normalizeHtml(container.innerHTML)).toBe(
      normalizeHtml(serializeVNodeToHtml(nextTree)),
    );
  });

  it('reads live form control values from the browser DOM', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <label>
        <input type="text" value="alpha" />
      </label>
    `;

    const input = container.querySelector('input');
    input.value = 'beta';

    const tree = domNodeToVNodeTree(container);
    const inputNode = tree.children[0].children[0];

    expect(inputNode.attrs.value).toBe('beta');
  });

  it('updates function event handlers during patching', () => {
    const container = document.createElement('div');
    const clicks = [];
    const previousTree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'button',
          attrs: {
            type: 'button',
            onClick: () => clicks.push('before'),
          },
          children: [{ type: 'text', value: 'Click' }],
        },
      ],
    };
    const nextTree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'button',
          attrs: {
            type: 'button',
            onClick: () => clicks.push('after'),
          },
          children: [{ type: 'text', value: 'Click' }],
        },
      ],
    };

    mountVNode(container, previousTree);
    patchDom(container, previousTree, nextTree);

    container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(clicks).toEqual(['after']);
  });

  it('preserves inline event attributes in virtual DOM and mounted DOM', () => {
    const tree = parseHtmlToVNode(`
      <button type="button" onclick="alert('hello')">Click</button>
    `);
    const buttonNode = tree.children[0];
    const container = document.createElement('div');

    mountVNode(container, tree);

    expect(buttonNode.attrs.onclick).toBe("alert('hello')");
    expect(container.querySelector('button').getAttribute('onclick')).toBe("alert('hello')");
  });
});
