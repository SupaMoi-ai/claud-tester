export interface EmbeddingProvider {
  // Returns a 512-d float vector. Throws on failure.
  embedImage(imageUrl: string): Promise<number[]>;
}
