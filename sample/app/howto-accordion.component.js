const KEYCODE = {
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  UP: 38,
  HOME: 36,
  END: 35,
};

const accordionTemplate = document.createElement('template');
accordionTemplate.innerHTML = `
  <style>
    :host {
      display: flex;
      flex-wrap: wrap;
      flex-direction: column;
      align-items: stretch;
    }
    ::slotted(.animating) {
      transition: transform 0.3s ease-in-out;
    }
  </style>
  <slot></slot>
`;

class HowtoAccordion extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(accordionTemplate.content.cloneNode(true));
  }

  connectedCallback() {
    this.addEventListener('change', this._onChange);
    this.addEventListener('keydown', this._onKeyDown);
    Promise.all([
      customElements.whenDefined('howto-accordion-heading'),
      customElements.whenDefined('howto-accordion-panel'),
    ])
      .then(_ => {
      const headings = this._allHeadings();
      headings.forEach(heading => {
        heading.setAttribute('tabindex', -1);
        const panel = this._panelForHeading(heading);
        heading.setAttribute('aria-controls', panel.id);
        panel.setAttribute('aria-labelledby', heading.id);
      });
      headings[0].setAttribute('tabindex', 0);
      headings
        .forEach(heading => {
          const panel = this._panelForHeading(heading);
          if (!heading.expanded) {
            this._collapseHeading(heading);
            this._collapsePanel(panel);
          } else {
            this._expandHeading(heading);
            this._expandPanel(panel);
          }
        });
      });
  }
  disconnectedCallback() {
    this.removeEventListener('change', this._onChange);
    this.removeEventListener('keydown', this._onKeyDown);
  }
  _isHeading(elem) {
    return elem.tagName.toLowerCase() === 'howto-accordion-heading';
  }
  _onChange(event) {
    this._animatePanelForHeading(event.target, event.detail.isExpandedNow);
  }
  _animatePanelForHeading(heading, expand) {
    if (this.classList.contains('animating'))
      return;
    const panel = this._panelForHeading(heading);
    if (expand) {
      this._expandPanel(panel);
      this._animateIn(panel);
    } else {
      this._animateOut(panel)
        .then(_ => this._collapsePanel(panel));
    }
  }
  _onKeyDown(event) {
    const currentHeading = event.target;
    if (!this._isHeading(currentHeading))
      return;
    if (event.altKey)
      return;
    let newHeading;
    switch (event.keyCode) {
      case KEYCODE.LEFT:
      case KEYCODE.UP:
        newHeading = this._prevHeading();
        break;

      case KEYCODE.RIGHT:
      case KEYCODE.DOWN:
        newHeading = this._nextHeading();
        break;

      case KEYCODE.HOME:
        newHeading = this._firstHeading();
        break;

      case KEYCODE.END:
        newHeading = this._lastHeading();
        break;
      default:
        return;
    }
    event.preventDefault();
    currentHeading.setAttribute('tabindex', -1);
    newHeading.setAttribute('tabindex', 0);
    newHeading.focus();
  }
  _allPanels() {
    return Array.from(this.querySelectorAll('howto-accordion-panel'));
  }
  _allHeadings() {
    return Array.from(this.querySelectorAll('howto-accordion-heading'));
  }
  _panelForHeading(heading) {
    const next = heading.nextElementSibling;
    if (next.tagName.toLowerCase() !== 'howto-accordion-panel') {
      console.error('Sibling element to a heading need to be a panel.');
      return;
    }
    return next;
  }
  _prevHeading() {
    const headings = this._allHeadings();
    let newIdx =
      headings.findIndex(headings =>
        headings === document.activeElement) - 1;
    return headings[(newIdx + headings.length) % headings.length];
  }
  _nextHeading() {
    const headings = this._allHeadings();
    let newIdx =
      headings.findIndex(heading =>
        heading === document.activeElement) + 1;
    return headings[newIdx % headings.length];
  }
  _firstHeading() {
    const headings = this._allHeadings();
    return headings[0];
  }
  _lastHeading() {
    const headings = this._allHeadings();
    return headings[headings.length - 1];
  }
  _expandPanel(panel) {
    panel.expanded = true;
  }
  _collapsePanel(panel) {
    panel.expanded = false;
  }
  _expandHeading(heading) {
    heading.expanded = true;
  }
  _collapseHeading(heading) {
    heading.expanded = false;
  }
  _animateIn(panel) {
    const height = panel.getBoundingClientRect().height;
    return this._animate(panel, -height, 0);
  }
  _animateOut(panel) {
    const height = panel.getBoundingClientRect().height;
    return this._animate(panel, 0, -height);
  }
  _animate(panel, startOffset, endOffset) {
    if (startOffset === endOffset)
      return Promise.resolve();
    this.classList.add('animating');
    const children = Array.from(this.children);
    const idx = children.indexOf(panel);
    const animatedChildren = children.slice(idx);
    this.style.overflow = 'hidden';
    children.forEach(child => {
      child.style.position = 'relative';
      child.style.zIndex = 2;
    });
    animatedChildren.forEach(child => {
      child.style.position = 'relative';
      child.style.zIndex = 1;
      child.style.transform = `translateY(${startOffset}px)`;
    });
    return requestAnimationFramePromise()
      .then(_ => requestAnimationFramePromise())
      .then(_ => {
        animatedChildren.forEach(child => {
          child.style.transform = `translateY(${endOffset}px)`;
          child.classList.add('animating');
        });
        return transitionEndPromise(panel);
      })
      .then(_ => {
        animatedChildren.forEach(child => {
          child.style.transform = '';
          child.classList.remove('animating');
        });
        children.forEach(child => {
          child.style.position = '';
          child.style.zIndex = '';
        });
        this.style.overflow = '';
        this.classList.remove('animating');
      });
  }
}
window.customElements.define('howto-accordion', HowtoAccordion);
let headingIdCounter = 0;
const accordionHeadingTemplate = document.createElement('template');
accordionHeadingTemplate.innerHTML = `
  <style>
    :host {
      contain: content;
    }
    button {
      display: block;
      background-color: initial;
      border: initial;
      width: 100%;
    }
  </style>
  <button><slot></slot></button>
`;
class HowtoAccordionHeading extends HTMLElement {
  static get observedAttributes() {
    return ['expanded'];
  }

  constructor() {
    super();
    this._onClick = this._onClick.bind(this);
    this.attachShadow({
      mode: 'open',
      delegatesFocus: true,
    });
    this.shadowRoot.appendChild(
      accordionHeadingTemplate.content.cloneNode(true)
    );
    this._shadowButton = this.shadowRoot.querySelector('button');
  }
  connectedCallback() {
    
    if (!this.hasAttribute('role'))
      this.setAttribute('role', 'heading');
    if (!this.id)
      this.id = `howto-accordion-heading-generated-${headingIdCounter++}`;
    this._shadowButton.addEventListener('click', this._onClick);
    this._shadowButton.setAttribute('aria-expanded', 'false');
  }
  disconnectedCallback() {
    this._shadowButton.removeEventListener('click', this._onClick);
  }
  attributeChangedCallback(name) {
    const value = this.hasAttribute('expanded');
    this._shadowButton.setAttribute('aria-expanded', value);
  }

  get expanded() {
    return this.hasAttribute('expanded');
  }
  set expanded(value) {
    value = Boolean(value);
    if (value)
      this.setAttribute('expanded', '');
    else
      this.removeAttribute('expanded');
  }
  _onClick() {
    this.expanded = !this.expanded;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: {isExpandedNow: this.expanded},
        bubbles: true,
      })
    );
  }
}

window.customElements
  .define('howto-accordion-heading', HowtoAccordionHeading);

const accordionPanelTemplate = document.createElement('template');
accordionPanelTemplate.innerHTML = `
  <style>
    :host(:not([expanded])) {
      display: none;
    }
  </style>
  <slot></slot>
`;
let panelIdCounter = 0;
class HowtoAccordionPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(
      accordionPanelTemplate.content.cloneNode(true)
    );
  }
  connectedCallback() {
    
    if (!this.hasAttribute('role'))
      this.setAttribute('role', 'region');
    if (!this.id)
      this.id = `howto-accordion-panel-generated-${panelIdCounter++}`;
  }

  get expanded() {
    return this.hasAttribute('expanded');
  }

  set expanded(val) {
    const value = Boolean(val);
    if (value)
      this.setAttribute('expanded', '');
    else
      this.removeAttribute('expanded');
  }
}
window.customElements
  .define('howto-accordion-panel', HowtoAccordionPanel);
function transitionEndPromise(element) {
  return new Promise(resolve => {
    element.addEventListener('transitionend', function f() {
      element.removeEventListener('transitionend', f);
      resolve();
    });
  });
}

function requestAnimationFramePromise() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}
