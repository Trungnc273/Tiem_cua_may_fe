export type DemoProduct = {
  name: string;
  price: string;
  badge: "DEMO";
  tones: string[];
};

export const demoProducts: DemoProduct[] = [
  { name: "Áo blouse nơ tay phồng", price: "259.000đ", badge: "DEMO", tones: ["#ffffff", "#a9d0eb", "#f3ced0", "#bbb"] },
  { name: "Chân váy tầng bồng bềnh", price: "239.000đ", badge: "DEMO", tones: ["#efe4d1", "#f2c9cc", "#343434"] },
  { name: "Áo khoác cardigan basic", price: "299.000đ", badge: "DEMO", tones: ["#a8cee9", "#f2e7d5", "#f1c9c9", "#bbb"] },
  { name: "Váy hoa nhí hai dây", price: "269.000đ", badge: "DEMO", tones: ["#a6c9e8", "#f0e2cf", "#f1c9cd"] },
];

export function filterDemoProducts(query: string): DemoProduct[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  if (!normalizedQuery) return demoProducts;
  return demoProducts.filter((product) => product.name.toLocaleLowerCase("vi").includes(normalizedQuery));
}
