class LookupGrid {

  constructor(width, height, sep) {
    this.width = width;
    this.height = height;
    this.sep = sep;
    this.bboxSize = Math.max(width, height);
    this.cellsCount = Math.ceil(this.bboxSize / sep);
    this.cells = new Map();
  }

  getCellByCoordinates(x, y) {
    const rowCoordinate = this.gridX(x);
    let row = this.cells.get(rowCoordinate);
    if (!row) {
      row = new Map();
      this.cells.set(rowCoordinate, row);
    }
    const colCoordinate = this.gridY(y);
    let cell = row.get(colCoordinate);
    if (!cell) {
      cell = new Cell();
      row.set(colCoordinate, cell)
    }
    return cell;
  }

  gridX(x) {
    return Math.floor(this.cellsCount * x / this.bboxSize);
  }

  gridY(y) {
    return Math.floor(this.cellsCount * y / this.bboxSize);
  }

  findNearest(x, y) {
    const cx = this.gridX(x);
    const cy = this.gridY(y);
    let minDistance = Infinity;
    for (let col = -1; col < 2; ++col) {
      const currentCellX = cx + col;
      if (currentCellX < 0 || currentCellX >= this.cellsCount) continue;
      const cellRow = this.cells.get(currentCellX);
      if (!cellRow) continue;
      for (let row = -1; row < 2; ++row) {
        const currentCellY = cy + row;
        if (currentCellY < 0 || currentCellY >= this.cellsCount) continue;
        const cellCol = cellRow.get(currentCellY);
        if (!cellCol) continue;
        let d = cellCol.getMinDistance(x, y);
        if (d < minDistance) minDistance = d;
      }
    }
    return minDistance;
  }

  isOutside(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    return false;
  }

  occupyCoordinates(point) {
    const x = point.x, y = point.y;
    this.getCellByCoordinates(x, y).occupy(point);
  }

  hasCloserThan(x, y, limit) {
    if (!this.cells) return false;
    const cx = this.gridX(x);
    const cy = this.gridY(y);
    for (let col = -1; col < 2; ++col) {
      const currentCellX = cx + col;
      if (currentCellX < 0 || currentCellX >= this.cellsCount) continue;
      const cellRow = this.cells.get(currentCellX);
      if (!cellRow) continue;
      for (let row = -1; row < 2; ++row) {
        const currentCellY = cy + row;
        if (currentCellY < 0 || currentCellY >= this.cellsCount) continue;
        const cellCol = cellRow.get(currentCellY);
        if (!cellCol) continue;
        if (cellCol.hasCloserThan(x, y, limit)) return true;
      }
    }
    return false;
  }
}

class Cell {
  constructor() {
    this.children = null;
  }

  occupy(point) {
    if (!this.children) this.children = [];
    this.children.push(point);
  }

  hasCloserThan(x, y, limit) {
    if (!this.children) return false;
    for (let i = 0; i < this.children.length; ++i) {
      const p = this.children[i];
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < limit) return true;
    }
    return false;
  }

  getMinDistance(x, y) {
    let minDistance = Infinity;
    if (!this.children) return minDistance;
    for (let i = 0; i < this.children.length; ++i) {
      const p = this.children[i];
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) minDistance = dist;
    }
    return minDistance;
  }
}

export {LookupGrid}
