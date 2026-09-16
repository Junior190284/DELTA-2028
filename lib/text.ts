const NAMED_HTML_ENTITIES:Record<string,string>={
  nbsp:" ",amp:"&",quot:'"',apos:"'",lt:"<",gt:">",
  aogon:"ą",Aogon:"Ą",cacute:"ć",Cacute:"Ć",eogon:"ę",Eogon:"Ę",
  lstrok:"ł",Lstrok:"Ł",nacute:"ń",Nacute:"Ń",oacute:"ó",Oacute:"Ó",
  sacute:"ś",Sacute:"Ś",zacute:"ź",Zacute:"Ź",zdot:"ż",Zdot:"Ż",
  ndash:"–",mdash:"—",hellip:"…",bull:"•"
};

export function decodeHtmlEntities(input:string){
  return input
    .replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(Number.parseInt(hex,16)))
    .replace(/&#(\d+);/g,(_,decimal)=>String.fromCodePoint(Number(decimal)))
    .replace(/&([a-z]+);/gi,(entity,name)=>NAMED_HTML_ENTITIES[name]??entity);
}
