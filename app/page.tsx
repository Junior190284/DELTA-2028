import Link from "next/link";

export default function Home() {
  return (
    <main style={{minHeight:"100vh",background:"#07090d",color:"#fff",fontFamily:"system-ui",padding:32}}>
      <div style={{maxWidth:900,margin:"0 auto"}}>
        <div style={{color:"#f0c95d",fontWeight:900,letterSpacing:2}}>DELTA 2018 GM</div>
        <h1 style={{fontSize:48,margin:"12px 0"}}>Online Team Hub</h1>
        <p style={{color:"#a7b2bf",lineHeight:1.6}}>
          Produkcyjny szkielet: Supabase Auth, RLS, prywatne profile dzieci,
          zdjęcia, mecze, statystyki, aktualności i Web Push.
        </p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:24}}>
          <Link href="/login" style={{padding:"12px 18px",background:"#d91a25",color:"#fff",textDecoration:"none",fontWeight:800}}>LOGOWANIE</Link>
          <Link href="/dashboard" style={{padding:"12px 18px",background:"#f0c95d",color:"#151109",textDecoration:"none",fontWeight:800}}>PANEL</Link>
          <a href="/prototype.html" style={{padding:"12px 18px",border:"1px solid #39414c",color:"#fff",textDecoration:"none",fontWeight:800}}>AKTUALNY PROTOTYP UI</a>
        </div>
      </div>
    </main>
  );
}
