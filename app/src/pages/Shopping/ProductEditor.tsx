import { generateId } from "../../services/id";
import { useEffect, useRef, useState } from "react";
import ProductSalesFields from "./ProductSalesFields";
import { salesError, type ProductSales } from "../../services/productSales";
import GoodsCropEditor from "./GoodsCropEditor";
import type { ShoppingProduct } from "../../services/shopping";
export default function ProductEditor({product,onSave,onCancel}:{product?:ShoppingProduct;onSave:(p:ShoppingProduct)=>void;onCancel:()=>void}) {
  const [sales,setSales]=useState<ProductSales>(product||{});
  const [error,setError]=useState('');
  const [image,setImage]=useState(product?.image);
  const formRef=useRef<HTMLFormElement>(null);
  useEffect(()=>{formRef.current?.scrollIntoView({block:"start",behavior:"smooth"});},[]);
  return <form ref={formRef} className="shopping-panel task-completion-form" onSubmit={e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);
    const name=String(f.get("name")).trim();if(!name)return;
    const problem=salesError(sales);if(problem){setError(problem);return;}
    onSave({...product,...sales,image,id:product?.id??generateId(),name,variant:String(f.get("variant")).trim(),price:Number(f.get("price")),category:String(f.get("category")).trim(),limit:f.get("limit") ? Number(f.get("limit")) : null,limitText:undefined});
  }}>
    <h2>{product?"商品を編集":"商品を追加"}</h2>
    {product?.image&&<section className="product-edit-image" aria-label="商品画像の編集">
      <img src={image} alt="保存する商品画像" />
      <GoodsCropEditor source={product.image} initial={{x:0,y:0,width:100,height:100}} onApply={next=>setImage(next)}/>
      {image!==product.image&&<><p role="status">画像を切り抜きました。下の「保存」で反映します。</p><button type="button" onClick={()=>setImage(product.image)}>編集前の画像に戻す</button></>}
    </section>}
    <label className="form-field">商品名（必須）<input name="name" required defaultValue={product?.name} /></label>
    <label className="form-field">種類・キャラクター<input name="variant" defaultValue={product?.variant} /></label>
    <div className="shopping-form-row"><label className="form-field">単価（円）<input name="price" type="number" min="0" max="99999999" step="1" required defaultValue={product?.price??0}/></label>
    <label className="form-field">購入上限（不明なら空欄）<input name="limit" type="number" min="1" max="9999" step="1" defaultValue={product?.limit??""}/></label></div>
    <label className="form-field">カテゴリ<input name="category" defaultValue={product?.category}/></label>
    <ProductSalesFields value={sales} onChange={patch=>setSales(old=>({...old,...patch}))}/>{error&&<p role="alert">{error}</p>}
    <div className="shopping-actions"><button type="submit">保存</button><button type="button" onClick={onCancel}>キャンセル</button></div>
  </form>;
}
