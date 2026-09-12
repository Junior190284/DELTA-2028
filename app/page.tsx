import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main style={{minHeight:"100vh",background:"#07090d",color:"#fff",fontFamily:"system-ui",padding:32}}>
      <div style={{maxWidth:900,margin:"0 auto"}}>
        <div style={{color:"#f0c95d",fontWeight:900,letterSpacing:2}}>DELTA 2018 GM</div>
        <h1 style={{fontSize:48,margin:"12px 0"}}>Online Team Hub</h1>
        <p style={{color:"#a7b2bf",lineHeight:1.6}}>
          Centrum drużyny: mecze, składy, obecności, statystyki, osiągnięcia i aktualności.
        </p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:24}}>
          <Link href="/login" style={{padding:"12px 18px",background:"#d91a25",color:"#fff",textDecoration:"none",fontWeight:800}}>ZALOGUJ SIĘ</Link>
        </div>
      </div>
    </main>
  );
}
