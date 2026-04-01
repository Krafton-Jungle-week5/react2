import { FunctionComponent, h, useEffect, useMemo, useState } from '../src/index.js';

async function flushUpdates() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('FunctionComponent runtime', () => {
  it('stores state in the root component and updates the DOM after setState', async () => {
    const container = document.createElement('div');

    function App() {
      const [count, setCount] = useState(0);

      return h(
        'section',
        {},
        h('p', { id: 'count' }, `count:${count}`),
        h(
          'button',
          {
            onClick: () => setCount((value) => value + 1),
            type: 'button',
          },
          'increment',
        ),
      );
    }

    new FunctionComponent(App).mount(container);

    container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUpdates();

    expect(container.querySelector('#count').textContent).toBe('count:1');
  });

  it('batches multiple state updates from the same event into one rerender', async () => {
    const container = document.createElement('div');
    let renderCount = 0;

    function App() {
      renderCount += 1;
      const [score, setScore] = useState(0);

      return h(
        'button',
        {
          id: 'batch-button',
          onClick: () => {
            setScore((value) => value + 1);
            setScore((value) => value + 1);
          },
          type: 'button',
        },
        `score:${score}`,
      );
    }

    new FunctionComponent(App).mount(container);

    container.querySelector('#batch-button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUpdates();

    expect(container.querySelector('#batch-button').textContent).toBe('score:2');
    expect(renderCount).toBe(2);
  });

  it('recomputes useMemo only when its dependency list changes', async () => {
    const container = document.createElement('div');
    let memoComputations = 0;

    function App() {
      const [count, setCount] = useState(1);
      const [label, setLabel] = useState('ready');
      const doubled = useMemo(() => {
        memoComputations += 1;
        return count * 2;
      }, [count]);

      return h(
        'section',
        {},
        h('p', { id: 'memo-value' }, `${label}:${doubled}`),
        h(
          'button',
          {
            id: 'label-button',
            onClick: () => setLabel('steady'),
            type: 'button',
          },
          'label',
        ),
        h(
          'button',
          {
            id: 'count-button',
            onClick: () => setCount((value) => value + 1),
            type: 'button',
          },
          'count',
        ),
      );
    }

    new FunctionComponent(App).mount(container);

    container.querySelector('#label-button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUpdates();

    expect(memoComputations).toBe(1);

    container.querySelector('#count-button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUpdates();

    expect(memoComputations).toBe(2);
    expect(container.querySelector('#memo-value').textContent).toBe('steady:4');
  });

  it('runs useEffect after commit and executes the previous cleanup before rerunning', async () => {
    const container = document.createElement('div');
    const logs = [];

    function App() {
      const [step, setStep] = useState(0);

      useEffect(() => {
        logs.push(container.querySelector('#effect-value')?.textContent ?? 'missing');
        return () => logs.push(`cleanup:${step}`);
      }, [step]);

      return h(
        'section',
        {},
        h('p', { id: 'effect-value' }, `step:${step}`),
        h(
          'button',
          {
            id: 'effect-button',
            onClick: () => setStep((value) => value + 1),
            type: 'button',
          },
          'next',
        ),
      );
    }

    new FunctionComponent(App).mount(container);

    expect(logs).toEqual(['step:0']);

    container.querySelector('#effect-button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUpdates();

    expect(logs).toEqual(['step:0', 'cleanup:0', 'step:1']);
  });

  it('rejects hooks inside child components because state belongs to the root only', () => {
    const container = document.createElement('div');

    function Child() {
      useState(0);
      return h('p', {}, 'child');
    }

    function App() {
      return h('section', {}, h(Child));
    }

    expect(() => {
      new FunctionComponent(App).mount(container);
    }).toThrow('root component');
  });

  it('publishes hook slots and render flow snapshots to the attached inspector', async () => {
    const container = document.createElement('div');
    const snapshots = [];

    function App() {
      const [count, setCount] = useState(0);
      const doubled = useMemo(() => count * 2, [count]);

      useEffect(() => {
        document.body.dataset.count = String(count);
      }, [count]);

      return h(
        'button',
        {
          id: 'inspector-button',
          onClick: () => setCount((value) => value + 1),
          type: 'button',
        },
        `value:${doubled}`,
      );
    }

    new FunctionComponent(App)
      .attachInspector({
        publish(snapshot) {
          snapshots.push(snapshot);
        },
      })
      .mount(container);

    snapshots.length = 0;

    container.querySelector('#inspector-button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUpdates();

    const snapshot = snapshots.at(-1);

    expect(snapshot.hooks.map((hook) => hook.hook)).toEqual(['useState', 'useMemo', 'useEffect']);
    expect(snapshot.flow.some((entry) => entry.title.includes('useState 슬롯 0'))).toBe(true);
    expect(snapshot.flow.some((entry) => entry.title.includes('scheduleUpdate'))).toBe(true);
    expect(snapshot.flow.some((entry) => entry.title.includes('renderAndCommit'))).toBe(true);
    expect(snapshot.flow.some((entry) => entry.title.includes('useEffect 슬롯 2 실행'))).toBe(true);
  });
});
