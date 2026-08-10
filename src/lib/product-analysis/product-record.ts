import type { ProductAnalysis, ProductDataSource } from "./types";

export type ProductRecord = {
  id: string;
  product_name: string;
  description: string;
  target: string;
  platform: string;
  product_url: string | null;
  image_name: string | null;
  analysis: ProductAnalysis;
  sales_score: number | null;
  sales_grade: string | null;
  source: ProductDataSource | string | null;
  created_at: string;
  updated_at: string;
};

export type ProductListItem = {
  id: string;
  product_name: string;
  platform: string;
  target: string;
  product_url: string | null;
  sales_score: number | null;
  sales_grade: string | null;
  source: string | null;
  summary: string;
  created_at: string;
};

export type SaveProductInput = {
  product_name: string;
  description: string;
  target: string;
  platform: string;
  product_url?: string | null;
  image_name?: string | null;
  analysis: ProductAnalysis;
};
