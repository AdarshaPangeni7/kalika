import {geometry} from './pdf-edit-engine.js';
export function inspectDocument(pdf,lib){
 if(pdf.getPageCount()>100)throw Error('Use a PDF with 100 pages or fewer.');
 // getForm() removes XFA data in pdf-lib; inspect the dictionary before calling it.
 const acro=pdf.catalog.lookupMaybe(lib.PDFName.of('AcroForm'),lib.PDFDict);
 if(acro?.has(lib.PDFName.of('XFA')))throw Error('XFA forms are not supported. Export an ordinary PDF copy first.');
 const form=pdf.getForm();
 if(form.getFields().some(f=>f instanceof lib.PDFSignature))throw Error('This PDF contains signature fields. Use an unsigned copy without certificate signature fields.');
 const pages=pdf.getPages().map(p=>{const unit=p.node.get(lib.PDFName.of('UserUnit'));if(unit&&unit.asNumber()!==1)throw Error('PDFs with custom page units are not supported.');const g=geometry(p);return {width:g.width,height:g.height};});
 const fields=form.getFields().map(f=>{
  const item={name:f.getName(),readonly:f.isReadOnly()};
  if(f instanceof lib.PDFTextField)return {...item,type:'text',value:f.getText()||'',multiline:f.isMultiline(),max:f.getMaxLength(),password:f.isPassword()};
  if(f instanceof lib.PDFCheckBox)return {...item,type:'checkbox',value:f.isChecked()};
  if(f instanceof lib.PDFDropdown||f instanceof lib.PDFOptionList)return {...item,type:'select',options:f.getOptions(),value:f.getSelected(),multiple:f.isMultiselect()};
  if(f instanceof lib.PDFRadioGroup)return {...item,type:'select',options:f.getOptions(),value:f.getSelected()?[f.getSelected()]:[],multiple:false};
  return {...item,type:'unsupported'};
 });
 return {pages,fields};
}
export async function exportDocument(original,lib,changes,marks,flatten){
 const pdf=await lib.PDFDocument.load(original.slice()),form=pdf.getForm(),font=await pdf.embedFont(lib.StandardFonts.Helvetica);
 for(const [name,value]of Object.entries(changes)){
  const f=form.getField(name);if(f.isReadOnly())continue;
  if(f instanceof lib.PDFTextField){try{font.encodeText(value);}catch{throw Error(`“${name}” needs supported Latin characters. For other scripts, use Add text over the page instead.`);}f.setText(value);f.updateAppearances(font);}
  else if(f instanceof lib.PDFCheckBox){value?f.check():f.uncheck();f.updateAppearances();}
  else if(f instanceof lib.PDFRadioGroup){value.length?f.select(value[0]):f.clear();f.updateAppearances();}
  else if(f instanceof lib.PDFDropdown||f instanceof lib.PDFOptionList){value.length?f.select(value):f.clear();f.updateAppearances(font);}
 }
 // Preserve untouched embedded appearances instead of replacing every field font.
 if(flatten&&form.getFields().length)form.flatten({updateFieldAppearances:false});
 for(const mark of marks){
  const page=pdf.getPage(mark.page),g=geometry(page);
  if(![mark.x,mark.y,mark.width,mark.height].every(Number.isFinite)||mark.width<=0||mark.height<=0||mark.x<0||mark.y<0||mark.x+mark.width>g.width+.01||mark.y+mark.height>g.height+.01)throw Error('An added item is outside its page. Move it inside or reduce its size.');
  const img=await pdf.embedPng(mark.image),at=g.map(mark.x,g.height-mark.y-mark.height);
  page.drawImage(img,{...at,width:mark.width,height:mark.height,rotate:lib.degrees(g.rotation)});
 }
 return pdf.save({updateFieldAppearances:false});
}
