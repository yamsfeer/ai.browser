// DOM节点基类
export class Node {
  constructor(nodeType, nodeName) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.parentNode = null;
    this.childNodes = [];
    this.nextSibling = null;
    this.previousSibling = null;
  }

  appendChild(child) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }

    child.parentNode = this;

    if (this.childNodes.length > 0) {
      const lastChild = this.childNodes[this.childNodes.length - 1];
      lastChild.nextSibling = child;
      child.previousSibling = lastChild;
    }

    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    const index = this.childNodes.indexOf(child);
    if (index !== -1) {
      this.childNodes.splice(index, 1);

      if (child.previousSibling) {
        child.previousSibling.nextSibling = child.nextSibling;
      }
      if (child.nextSibling) {
        child.nextSibling.previousSibling = child.previousSibling;
      }

      child.parentNode = null;
      child.previousSibling = null;
      child.nextSibling = null;
    }
    return child;
  }

  insertBefore(newChild, referenceChild) {
    if (!referenceChild) {
      return this.appendChild(newChild);
    }

    const index = this.childNodes.indexOf(referenceChild);
    if (index === -1) {
      throw new Error('Reference child not found');
    }

    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }

    newChild.parentNode = this;
    this.childNodes.splice(index, 0, newChild);

    const previousChild = this.childNodes[index - 1];
    if (previousChild) {
      previousChild.nextSibling = newChild;
      newChild.previousSibling = previousChild;
    } else {
      newChild.previousSibling = null;
    }

    newChild.nextSibling = referenceChild;
    referenceChild.previousSibling = newChild;

    return newChild;
  }
}