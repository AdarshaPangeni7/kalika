// Compression has different rules from page copying: ordinary unsigned forms
// can be retained, or flattened deliberately for a smaller image-only copy.
export async function prepareCompression(pdf,data,lib,image){
 const {PDFName,PDFDict,PDFArray,PDFNull,PDFSignature}=lib;
 const key=name=>PDFName.of(name);
 for(const [,object] of pdf.context.enumerateIndirectObjects()){
  if(!(object instanceof PDFDict))continue;
  const signedField=object.get(key('FT'))?.toString()==='/Sig'&&object.has(key('V'))&&pdf.context.lookup(object.get(key('V')))!==PDFNull;
  if(signedField||object.has(key('ByteRange'))||object.get(key('Type'))?.toString()==='/Sig')throw Error('This PDF is digitally signed. Compressing it would invalidate its signature. Keep the original or choose an unsigned copy.');
 }
 const acro=pdf.context.lookup(pdf.catalog.get(key('AcroForm')));
 const fields=acro instanceof PDFDict?pdf.context.lookup(acro.get(key('Fields'))):null;
 const hasFields=fields instanceof PDFArray&&fields.size()>0;
 if(!image)return {data,hasFields};
 if(acro instanceof PDFDict&&acro.has(key('XFA')))throw Error('This PDF uses a special form format. Choose Keep text, or save a copy using Print to PDF and try again.');
 if(hasFields){
  try{
   const form=pdf.getForm();
   // Empty signing boxes are not signatures and have no visible appearance to flatten.
   for(const field of form.getFields())if(PDFSignature&&field instanceof PDFSignature)form.removeField(field);
   form.flatten({updateFieldAppearances:false});
   return {data:await pdf.save({useObjectStreams:true,updateFieldAppearances:false}),hasFields};
  }catch{throw Error('Some form entries could not be kept safely in a smaller copy. Choose Keep text, or save a copy using Print to PDF and try again.');}
 }
 return {data,hasFields};
}
