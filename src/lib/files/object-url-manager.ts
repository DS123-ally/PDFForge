export class ObjectUrlManager {
  private urls = new Set<string>();

  create(file: Blob) {
    const url = URL.createObjectURL(file);
    this.urls.add(url);
    return url;
  }

  revoke(url: string) {
    if (!this.urls.has(url)) {
      return;
    }

    URL.revokeObjectURL(url);
    this.urls.delete(url);
  }

  revokeAll() {
    for (const url of this.urls) {
      URL.revokeObjectURL(url);
    }

    this.urls.clear();
  }

  get size() {
    return this.urls.size;
  }
}
