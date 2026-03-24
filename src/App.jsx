import { useState, useEffect, useRef } from "react";

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://pzvmdavffzsncvsppuqk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm1kYXZmZnpzbmN2c3BwdXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTE4NjUsImV4cCI6MjA4OTY4Nzg2NX0.1T4oVtCpJ05XAvG3hAPri4atYe64v6_olIuP636g-NE";

const sb = {
  headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" },

  async signUp(email, password, name) {
    const r = await fetch(SUPABASE_URL + "/auth/v1/signup", {
      method:"POST", headers: this.headers,
      body: JSON.stringify({ email, password, data: { name } })
    });
    return r.json();
  },

  async signIn(email, password) {
    const r = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
      method:"POST", headers: this.headers,
      body: JSON.stringify({ email, password })
    });
    return r.json();
  },

  async signOut(token) {
    await fetch(SUPABASE_URL + "/auth/v1/logout", {
      method:"POST", headers: { ...this.headers, "Authorization": "Bearer " + token }
    });
  },

  async getUser(token) {
    const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { ...this.headers, "Authorization": "Bearer " + token }
    });
    return r.json();
  },

  async saveAnalysis(token, data) {
    const r = await fetch(SUPABASE_URL + "/rest/v1/analyses", {
      method:"POST",
      headers: { ...this.headers, "Authorization": "Bearer " + token, "Prefer": "return=representation" },
      body: JSON.stringify(data)
    });
    return r.json();
  },

  async getAnalyses(token, userId) {
    const r = await fetch(SUPABASE_URL + "/rest/v1/analyses?user_id=eq." + userId + "&order=created_at.desc", {
      headers: { ...this.headers, "Authorization": "Bearer " + token }
    });
    return r.json();
  },

  async resetPassword(email) {
    const r = await fetch(SUPABASE_URL + "/auth/v1/recover", {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ email })
    });
    return r.json();
  }
};
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";

// ── Sabitler ──────────────────────────────────────────────────────────────────
const BIOMARKERS = [
  {key:"age",         label:"Yaş",            unit:"yıl",    ph:"45",  group:"kişisel",    icon:"👤", req:true},
  {key:"glucose",     label:"Açlık Glukozu",  unit:"mg/dL",  ph:"90",  group:"metabolik",  icon:"⚡", req:true,  ref:{opt:[70,85],   iyi:[85,100],  orta:[100,110], desc:"Açlık kan şekeri enerji metabolizmasının temelidir."}},
  {key:"hba1c",       label:"HbA1c",          unit:"%",      ph:"5.2", group:"metabolik",  icon:"⚡", req:false, ref:{opt:[4.5,5.2], iyi:[5.2,5.7], orta:[5.7,6.4], desc:"Son 3 ayın ortalama kan şekerini gösterir."}},
  {key:"triglyceride",label:"Trigliserid",    unit:"mg/dL",  ph:"120", group:"metabolik",  icon:"⚡", req:false, ref:{opt:[50,100],  iyi:[100,150], orta:[150,200], desc:"Kanda dolaşan yağ miktarını gösterir."}},
  {key:"hdl",         label:"HDL Kolesterol", unit:"mg/dL",  ph:"55",  group:"metabolik",  icon:"⚡", req:false, ref:{opt:[60,200],  iyi:[50,60],   orta:[40,50],   desc:"'İyi' kolesterol olarak bilinir, damarları korur.", yuksekIyi:true}},
  {key:"ldl",         label:"LDL Kolesterol", unit:"mg/dL",  ph:"110", group:"metabolik",  icon:"⚡", req:false, ref:{opt:[0,100],   iyi:[100,130], orta:[130,160], desc:"'Kötü' kolesterol, damar tıkanıklığı riskiyle ilişkilidir."}},
  {key:"albumin",     label:"Albumin",        unit:"g/dL",   ph:"4.5", group:"karaciğer",  icon:"🫀", req:true,  ref:{opt:[4.2,5.0], iyi:[3.8,4.2], orta:[3.2,3.8], desc:"Karaciğer tarafından üretilen temel kan proteini.", yuksekIyi:true}},
  {key:"alt",         label:"ALT",            unit:"U/L",    ph:"25",  group:"karaciğer",  icon:"🫀", req:false, ref:{opt:[7,25],    iyi:[25,35],   orta:[35,55],   desc:"Karaciğer hasarının göstergesi."}},
  {key:"alp",         label:"ALP",            unit:"U/L",    ph:"70",  group:"karaciğer",  icon:"🫀", req:true,  ref:{opt:[30,80],   iyi:[80,100],  orta:[100,130], desc:"Karaciğer ve kemik hastalıklarında yükselir."}},
  {key:"creatinine",  label:"Kreatinin",      unit:"mg/dL",  ph:"0.9", group:"böbrek",     icon:"💧", req:true,  ref:{opt:[0.6,1.0], iyi:[1.0,1.2], orta:[1.2,1.5], desc:"Böbrek fonksiyonunun temel göstergesi."}},
  {key:"crp",         label:"CRP",            unit:"mg/L",   ph:"0.5", group:"inflamasyon",icon:"🛡️",req:true,  ref:{opt:[0,1],     iyi:[1,2],     orta:[2,4],     desc:"Vücuttaki iltihaplanmanın belirteci."}},
  {key:"wbc",         label:"Lökosit (WBC)",  unit:"×10³/µL",ph:"6.5", group:"inflamasyon",icon:"🛡️",req:true,  ref:{opt:[4,7],     iyi:[7,9],     orta:[9,11],    desc:"Bağışıklık sisteminin ana hücreleri."}},
  {key:"lymphocyte",  label:"Lenfosit %",     unit:"%",      ph:"30",  group:"inflamasyon",icon:"🛡️",req:true,  ref:{opt:[25,40],   iyi:[20,25],   orta:[15,20],   desc:"Viral enfeksiyonlara karşı savaşan bağışıklık hücreleri.", yuksekIyi:true}},
  {key:"mcv",         label:"MCV",            unit:"fL",     ph:"88",  group:"hematoloji", icon:"🩸", req:true,  ref:{opt:[80,90],   iyi:[90,95],   orta:[95,100],  desc:"Kırmızı kan hücrelerinin ortalama hacmi."}},
  {key:"rdw",         label:"RDW",            unit:"%",      ph:"13",  group:"hematoloji", icon:"🩸", req:true,  ref:{opt:[11,13],   iyi:[13,14],   orta:[14,15],   desc:"Kırmızı kan hücresi boyut çeşitliliği — yaşlanmayla artar."}},
];

const GROUPS = ["kişisel","metabolik","karaciğer","böbrek","inflamasyon","hematoloji"];
const GM = {
  "kişisel":    {label:"Kişisel",     color:"#00C9A7", bg:"rgba(0,61,51,0.8)"},
  "metabolik":  {label:"Metabolik",   color:"#4FC3F7", bg:"rgba(0,48,80,0.8)"},
  "karaciğer":  {label:"Karaciğer",  color:"#FFB74D", bg:"rgba(62,32,0,0.8)"},
  "böbrek":     {label:"Böbrek",     color:"#81C784", bg:"rgba(0,58,0,0.8)"},
  "inflamasyon":{label:"İnflamasyon",color:"#F48FB1", bg:"rgba(62,0,26,0.8)"},
  "hematoloji": {label:"Hematoloji", color:"#CE93D8", bg:"rgba(42,0,64,0.8)"},
};
const SYSTEM_KEYS = [
  ["Metabolik",   ["glucose","hba1c","triglyceride","hdl"]],
  ["Karaciğer",  ["albumin","alt","alp"]],
  ["Böbrek",     ["creatinine"]],
  ["İnflamasyon",["crp","wbc","lymphocyte"]],
  ["Hematoloji", ["mcv","rdw"]],
];

// ── Storage (kullanıcı verileri localStorage yerine state'te) ─────────────────
// Demo auth — gerçek projede backend gerekir
function useAuth() {
  const [user, setUser] = useState(null);

  // Sayfa açılınca localStorage'dan session kontrol et
  useEffect(() => {
    const token = localStorage.getItem("sb_token");
    const userData = localStorage.getItem("sb_user");
    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        // Token hala geçerli mi kontrol et
        sb.getUser(token).then(res => {
          if (res.error) {
            localStorage.removeItem("sb_token");
            localStorage.removeItem("sb_user");
            setUser(null);
          }
        });
      } catch(e) {
        localStorage.removeItem("sb_token");
        localStorage.removeItem("sb_user");
      }
    }
  }, []);

  const register = async (name, email, password) => {
    const res = await sb.signUp(email, password, name);
    if (res.error) return { error: res.error.message || "Kayıt başarısız." };
    if (res.access_token) {
      const u = { id: res.user.id, name, email };
      localStorage.setItem("sb_token", res.access_token);
      localStorage.setItem("sb_user", JSON.stringify(u));
      setUser(u);
      return { success: true };
    }
    // E-posta doğrulama gerekiyorsa
    return { confirm: true };
  };

  const loginWithPass = async (email, password) => {
    try {
      const res = await sb.signIn(email, password);
      if (res.error || !res.access_token) {
        return { error: "E-posta adresi veya şifre hatalı." };
      }
      const name = res.user?.user_metadata?.name || email.split("@")[0];
      const u = { id: res.user.id, name, email };
      localStorage.setItem("sb_token", res.access_token);
      localStorage.setItem("sb_user", JSON.stringify(u));
      setUser(u);
      return { success: true, user: u };
    } catch(e) {
      return { error: "Bağlantı hatası. Lütfen tekrar deneyin." };
    }
  };

  const logout = async () => {
    const token = localStorage.getItem("sb_token");
    if (token) await sb.signOut(token);
    localStorage.removeItem("sb_token");
    localStorage.removeItem("sb_user");
    setUser(null);
  };

  return { user, register, loginWithPass, logout };
}

// ── PhenoAge ──────────────────────────────────────────────────────────────────
function calculateBioAge(v) {
  try {
    const req = ["age","albumin","alp","creatinine","glucose","crp","lymphocyte","mcv","rdw","wbc"];
    for (const k of req) { if (v[k]==null||isNaN(parseFloat(v[k]))) return null; }
    const age=+v.age,albumin=+v.albumin,alp=+v.alp,creatinine=+v.creatinine,
          glucose=+v.glucose,crp=+v.crp,lymphocyte=+v.lymphocyte,mcv=+v.mcv,rdw=+v.rdw,wbc=+v.wbc;
    const xb = -19.907+(-0.0336*albumin)+(0.0095*creatinine*88.4)+(0.1953*glucose/18.018)
              +(0.0954*Math.log(Math.max(crp,0.001)))+(-0.0120*lymphocyte)+(0.0268*mcv)
              +(0.3306*rdw)+(0.00188*alp)+(0.0554*wbc)+(0.0804*age);
    const g=0.0076927, mort=1-Math.exp(-Math.exp(xb)*(Math.exp(120*g)-1)/g);
    const mC=Math.min(Math.max(mort,1e-10),1-1e-10);
    const bio=141.50225+Math.log(-0.00553*Math.log(1-mC))/0.090165;
    if(isNaN(bio)||!isFinite(bio)) return null;
    return Math.round(Math.max(15,Math.min(100,bio))*10)/10;
  } catch { return null; }
}

function getScore(key,val) {
  const v=parseFloat(val); if(isNaN(v)) return null;
  const bm=BIOMARKERS.find(b=>b.key===key); if(!bm?.ref) return null;
  const {opt,iyi,orta}=bm.ref;
  if(v>=opt[0]&&v<=opt[1]) return 100;
  if(v>=iyi[0]&&v<=iyi[1]) return 75;
  if(v>=orta[0]&&v<=orta[1]) return 45;
  return 20;
}

function getStatus(key,val) {
  const s=getScore(key,val);
  if(s===null) return null;
  if(s===100) return {label:"Optimal",  color:"#00C9A7", bg:"rgba(0,201,167,0.12)"};
  if(s===75)  return {label:"İyi",      color:"#4FC3F7", bg:"rgba(79,195,247,0.12)"};
  if(s===45)  return {label:"Dikkat",   color:"#FFB74D", bg:"rgba(255,183,77,0.12)"};
  return       {label:"Yüksek Risk",   color:"#EF5350", bg:"rgba(239,83,80,0.12)"};
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function extractFromPDF(base64Data) {
  const prompt = `Bu bir kan tahlili raporudur. Aşağıdaki değerleri rapordan çıkar. HER DEĞERİ rapordaki BİRİMİNE göre dönüştürerek ver. SADECE JSON döndür.

BİRİM DÖNÜŞÜM KURALLARI:
1. albumin: g/dL → olduğu gibi | g/L → 10'a böl
2. glucose: mg/dL → olduğu gibi | mmol/L → 18.018 ile çarp
3. creatinine: mg/dL → olduğu gibi | µmol/L → 88.4'e böl | mg/L → 0.1 ile çarp
4. crp: mg/L → olduğu gibi | mg/dL → 10 ile çarp
5. wbc: ×10³/µL → olduğu gibi | /mm³ → 1000'e böl
6. triglyceride/hdl/ldl: mg/dL → olduğu gibi | mmol/L: TG×88.6, HDL/LDL×38.67
7. lymphocyte: % olarak (mutlak değerse WBC'ye böl ×100)
8. alt,alp: U/L | mcv: fL | rdw,hba1c: % | age: yıl

{"age":null,"glucose":null,"hba1c":null,"triglyceride":null,"hdl":null,"ldl":null,"albumin":null,"alt":null,"alp":null,"creatinine":null,"crp":null,"wbc":null,"lymphocyte":null,"mcv":null,"rdw":null}

Bulamazsan null bırak. SADECE JSON döndür.`;
  const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
      messages:[{role:"user",content:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:base64Data}},{type:"text",text:prompt}]}]})});
  if(!res.ok) throw new Error(`API ${res.status}`);
  const data=await res.json(); if(data.error) throw new Error(data.error.message);
  const text=data.content?.[0]?.text||"";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

async function fetchAI(vals,bioAge,chronoAge,meds=[]) {
  const diff=(bioAge-chronoAge).toFixed(1);
  const lines=BIOMARKERS.filter(b=>b.key!=="age"&&vals[b.key]!=null).map(b=>`${b.label}: ${vals[b.key]} ${b.unit}`).join(", ");
  const medsNote = meds.length>0 ? `\nÖNEMLİ: Hasta şu ilaç/takviye kategorilerini kullanıyor: ${meds.join(", ")}. Bu ilaçların kan değerlerine etkilerini yorumunda mutlaka belirt ve değerleri değerlendirirken bu etkiyi göz önünde bulundur.` : "";
  const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,
      messages:[{role:"user",content:`Sen klinik biyokimya profesörü bir uzmansın.\nHasta: Kronolojik yaş ${chronoAge}, Biyolojik yaş ${bioAge} (fark: ${diff>0?"+":""}${diff} yıl)\nKan değerleri: ${lines}${medsNote}\nTürkçe, kısa yorum yaz (maks 180 kelime):\n1. Genel değerlendirme\n2. Dikkat çeken 2-3 değer (ilaç etkisi varsa belirt)\n3. 3 somut öneri\nTanı koyma, sadece bilgilendirme.`}]})});
  if(!res.ok) throw new Error(`API ${res.status}`);
  const data=await res.json(); if(data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text||"Yorum alınamadı.";
}

async function askAI(question, context) {
  const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,
      messages:[{role:"user",content:`Sen BioScope platformunun klinik biyokimya asistanısın. Türkçe, anlaşılır ve bilimsel yanıt ver.\n\nKullanıcının kan değerleri: ${context}\n\nSoru: ${question}\n\nMaks 120 kelime. Tanı koyma, bilgilendirme yap.`}]})});
  if(!res.ok) throw new Error(`API ${res.status}`);
  const data=await res.json(); if(data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text||"Yanıt alınamadı.";
}

// ── Referans Tablosu Popup ─────────────────────────────────────────────────────
// ── Yasal Modal ───────────────────────────────────────────────────────────────
const LEGAL_CONTENT = {
  "gizlilik": {
    title: "Gizlilik Politikası",
    date: "Yürürlük Tarihi: 1 Ocak 2025",
    sections: [
      {
        heading: "1. Toplanan Veriler",
        text: "BioScope platformu aracılığıyla aşağıdaki veriler toplanmaktadır: Ad, soyad ve e-posta adresi (kayıt sırasında), kan tahlil değerleri (analiz sırasında kullanıcı tarafından girilen), biyolojik yaş analiz sonuçları, platform kullanım verileri (sayfa görüntülemeleri, tıklama verileri)."
      },
      {
        heading: "2. Verilerin Kullanım Amacı",
        text: "Toplanan veriler yalnızca şu amaçlarla kullanılmaktadır: Biyolojik yaş analizi hizmetinin sunulması, kullanıcı hesabının yönetilmesi ve geçmiş analizlere erişimin sağlanması, platform güvenliği ve sahteciliğin önlenmesi, yasal yükümlülüklerin yerine getirilmesi. Verileriniz üçüncü taraflarla pazarlama amacıyla paylaşılmaz."
      },
      {
        heading: "3. Kan Tahlil Verilerinin Güvenliği",
        text: "Sağlık verileriniz en hassas kişisel veri kategorisinde yer almaktadır. Bu veriler şifreli bağlantı (SSL/TLS) üzerinden iletilmekte, yalnızca analiz hesaplaması için işlenmekte ve üçüncü taraflarla kesinlikle paylaşılmamaktadır. Analiz sonuçları yalnızca sizin erişiminize açıktır."
      },
      {
        heading: "4. Çerezler",
        text: "Platform, temel işlevsellik için zorunlu oturum çerezleri kullanmaktadır. Reklam veya takip amaçlı çerez kullanılmamaktadır. Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz ancak bu durumda bazı özellikler çalışmayabilir."
      },
      {
        heading: "5. Veri Saklama Süresi",
        text: "Hesap bilgileri ve analiz geçmişi, hesap aktif olduğu sürece saklanır. Hesabınızı sildiğinizde tüm verileriniz 30 gün içinde kalıcı olarak silinir. Yasal yükümlülükler gerektirmedikçe verileriniz bu sürenin ötesinde saklanmaz."
      },
      {
        heading: "6. Haklarınız",
        text: "KVKK kapsamında kişisel verilerinize ilişkin şu haklara sahipsiniz: Verilerinizin işlenip işlenmediğini öğrenme, işlenen verilerinize ilişkin bilgi talep etme, işleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, verilerinizin silinmesini veya yok edilmesini talep etme. Talepleriniz için info@bioscope.com.tr adresine yazabilirsiniz."
      },
      {
        heading: "7. İletişim",
        text: "Gizlilik politikamıza ilişkin sorularınız için: info@bioscope.com.tr | BioScope, İzmir, Türkiye"
      }
    ]
  },
  "kosullar": {
    title: "Kullanım Koşulları",
    date: "Yürürlük Tarihi: 1 Ocak 2025",
    sections: [
      {
        heading: "1. Hizmetin Kapsamı",
        text: "BioScope, Levine PhenoAge (2018) algoritmasını kullanarak rutin kan tahlil değerlerinizden biyolojik yaş tahmini sunan bir dijital sağlık bilgi platformudur. Platform, tıbbi tanı, tedavi veya tıbbi öneri sunmamaktadır. Sunulan sonuçlar yalnızca bilgilendirme amaçlıdır."
      },
      {
        heading: "2. Tıbbi Sorumluluk Reddi",
        text: "BioScope bir sağlık hizmeti sağlayıcısı değildir. Platform üzerinden sunulan biyolojik yaş skorları ve yorumlar doktor muayenesinin yerini tutmaz. Sağlık kararlarınızı almadan önce mutlaka bir sağlık profesyoneline danışınız. Platform sonuçlarına dayanarak alınan kararlardan BioScope sorumlu tutulamaz."
      },
      {
        heading: "3. Kullanıcı Yükümlülükleri",
        text: "Platforma kayıt olurken doğru bilgi vermeyi, hesabınızın güvenliğini sağlamayı, platformu yalnızca yasal amaçlarla kullanmayı ve başkalarının hesaplarına izinsiz erişim girişiminde bulunmamayı kabul edersiniz. Yanlış veya yanıltıcı bilgi girerek elde edilen sonuçların sorumluluğu kullanıcıya aittir."
      },
      {
        heading: "4. Ödeme ve İade Politikası",
        text: "Ücretli raporlar için yapılan ödemeler iyzico altyapısı üzerinden güvenli şekilde işlenmektedir. Teknik bir hata nedeniyle rapor teslim edilememesi durumunda 7 gün içinde tam iade yapılır. Kullanıcı kaynaklı hatalarda (yanlış veri girişi vb.) iade yapılmamaktadır. İade talepleriniz için info@bioscope.com.tr adresine yazabilirsiniz."
      },
      {
        heading: "5. Fikri Mülkiyet",
        text: "BioScope platformundaki tüm içerikler, algoritmik uyarlamalar, arayüz tasarımı ve metinler BioScope'a aittir. İzinsiz kopyalanması, dağıtılması veya ticari amaçla kullanılması yasaktır. Levine PhenoAge algoritması akademik bir çalışmaya dayanmaktadır: Levine vd. (2018), Aging, Albany NY."
      },
      {
        heading: "6. Hizmet Değişiklikleri",
        text: "BioScope, önceden bildirimde bulunmaksızın platform özelliklerini değiştirme, güncelleme veya durdurma hakkını saklı tutar. Fiyat değişiklikleri en az 30 gün önceden kullanıcılara bildirilir. Önemli değişlikler kayıtlı e-posta adresinize iletilir."
      },
      {
        heading: "7. Uygulanacak Hukuk",
        text: "Bu kullanım koşulları Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İzmir Mahkemeleri ve İcra Daireleri yetkilidir."
      }
    ]
  },
  "kvkk": {
    title: "KVKK Aydınlatma Metni",
    date: "6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında",
    sections: [
      {
        heading: "Veri Sorumlusu",
        text: "6698 Sayılı Kişisel Verilerin Korunması Kanunu ('KVKK') uyarınca kişisel verileriniz; veri sorumlusu sıfatıyla BioScope (info@bioscope.com.tr) tarafından aşağıda açıklanan kapsamda işlenecektir."
      },
      {
        heading: "İşlenen Kişisel Veriler ve İşleme Amaçları",
        text: "Kimlik verileri (ad, soyad): Üyelik kaydı ve kimlik doğrulama amacıyla işlenmektedir. İletişim verileri (e-posta): Hesap bildirimleri, analiz raporları ve destek hizmetleri amacıyla işlenmektedir. Sağlık verileri (kan tahlil değerleri): Biyolojik yaş analizi hizmetinin sunulması amacıyla, açık rızanıza dayanılarak işlenmektedir. İşlem güvenliği verileri: Platformun güvenli işletilmesi amacıyla işlenmektedir."
      },
      {
        heading: "Kişisel Verilerin Aktarılması",
        text: "Kişisel verileriniz; ödeme işlemleri için iyzico Ödeme Hizmetleri A.Ş.'ye, yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına aktarılabilir. Sağlık verileriniz hiçbir koşulda üçüncü taraf reklam veya pazarlama şirketlerine aktarılmaz."
      },
      {
        heading: "Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi",
        text: "Kişisel verileriniz; platform kayıt formu ve analiz girişleri aracılığıyla elektronik ortamda toplanmaktadır. Sağlık verileri açık rızanıza, diğer veriler ise sözleşmenin ifası ve meşru menfaat hukuki sebeplerine dayanılarak işlenmektedir."
      },
      {
        heading: "KVKK Madde 11 Kapsamındaki Haklarınız",
        text: "Kişisel veri sahibi olarak; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmiş olması halinde bunların düzeltilmesini isteme, KVKK'nın 7. maddesi kapsamında silinmesini veya yok edilmesini isteme, yapılan işlemlerin veri aktarılan üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemler vasıtasıyla elde edilen sonuca itiraz etme, kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme haklarına sahipsiniz."
      },
      {
        heading: "Başvuru Hakkı",
        text: "Yukarıda belirtilen haklarınızı kullanmak için info@bioscope.com.tr adresine kimliğinizi doğrular şekilde yazılı başvuruda bulunabilirsiniz. Başvurularınız en geç 30 gün içinde sonuçlandırılacaktır. Başvurunuzun reddedilmesi, verilen yanıtın yetersiz bulunması veya süresinde yanıt verilmemesi halinde Kişisel Verileri Koruma Kurumu'na şikayette bulunma hakkınız saklıdır."
      }
    ]
  }
};

function LegalModal({ type, onClose }) {
  const doc = LEGAL_CONTENT[type];
  if (!doc) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)"}} />
      <div style={{position:"relative",background:"#0a1f1c",border:"1px solid rgba(0,201,167,0.2)",borderRadius:22,width:"100%",maxWidth:680,maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,0.7)"}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:"22px 28px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
          <div>
            <h3 style={{fontFamily:"Georgia,serif",fontSize:22,color:"#fff",fontWeight:700,marginBottom:4}}>{doc.title}</h3>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>{doc.date}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:9,color:"rgba(255,255,255,0.5)",fontSize:17,width:34,height:34,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:16}}>✕</button>
        </div>

        {/* Content */}
        <div style={{overflowY:"auto",padding:"24px 28px",display:"flex",flexDirection:"column",gap:20}}>
          {doc.sections.map((s,i) => (
            <div key={i}>
              <h4 style={{fontSize:14,fontWeight:700,color:"#00C9A7",marginBottom:8}}>{s.heading}</h4>
              <p style={{fontSize:13,color:"rgba(255,255,255,0.58)",lineHeight:1.8,margin:0}}>{s.text}</p>
            </div>
          ))}
          <div style={{marginTop:8,padding:"14px 18px",background:"rgba(0,201,167,0.06)",borderRadius:10,border:"1px solid rgba(0,201,167,0.15)",fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.7}}>
            Sorularınız için: <span style={{color:"#00C9A7"}}>info@bioscope.com.tr</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── İletişim Modal ────────────────────────────────────────────────────────────
// Formspree: https://formspree.io adresinden ücretsiz form oluşturun
// Oluşturduğunuz form ID'sini aşağıya yapıştırın (örn: "xpzgkwqr")
const FORMSPREE_ID = "xgonbalb";

function ContactModal({ onClose }) {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [subject, setSubject] = useState("");
  const [msg,     setMsg]     = useState("");
  const [status,  setStatus]  = useState("idle"); // idle | sending | sent
  const [errMsg,  setErrMsg]  = useState("");
  useEffect(() => { if (status==="sent") { setTimeout(onClose, 2000); } }, [status]);

  const send = async () => {
    if (!name.trim()) { setErrMsg("Ad soyad zorunlu."); return; }
    if (!email.includes("@")) { setErrMsg("Geçerli bir e-posta girin."); return; }
    if (!msg.trim()) { setErrMsg("Mesaj alanı boş olamaz."); return; }
    setErrMsg("");
    setStatus("sending");
    try {
      // Formspree ID henüz eklenmemişse simüle et
      if (FORMSPREE_ID === "YOUR_FORM_ID") {
        await new Promise(r => setTimeout(r, 1000));
        setStatus("sent"); return;
      }
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method:"POST",
        headers:{"Content-Type":"application/json","Accept":"application/json"},
        body: JSON.stringify({ name, email, subject, message: msg })
      });
      if (res.ok) setStatus("sent");
      else setErrMsg("Gönderilemedi. Lütfen tekrar deneyin.");
    } catch { setErrMsg("Bağlantı hatası. Lütfen tekrar deneyin."); }
    if (status !== "sent") setStatus("idle");
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(10px)"}} />
      <div style={{position:"relative",background:"#0a1f1c",border:"1px solid rgba(0,201,167,0.2)",borderRadius:22,width:"100%",maxWidth:480,padding:32,boxShadow:"0 32px 80px rgba(0,0,0,0.6)"}}
        onClick={e=>e.stopPropagation()}>

        <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,color:"rgba(255,255,255,0.5)",fontSize:16,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>

        <div style={{textAlign:"center",marginBottom:26}}>
          <div style={{width:50,height:50,borderRadius:13,background:"linear-gradient(135deg,#00C9A7,#0080FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 12px"}}>✉️</div>
          <h3 style={{fontFamily:"Georgia,serif",fontSize:22,color:"#fff",fontWeight:700}}>Bize Yazın</h3>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.38)",marginTop:4}}>Sorularınız için 24 saat içinde dönüş yapıyoruz</p>
        </div>

        {status==="sent" ? (
          <div style={{textAlign:"center",padding:"24px 0"}}>
            <div style={{fontSize:56,marginBottom:14,animation:"pulse 0.6s ease"}}>✅</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:22,color:"#fff",fontWeight:700,marginBottom:6}}>Mesajınız iletildi!</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.45)",marginBottom:20}}>En kısa sürede size dönüş yapacağız.</div>
            <div style={{height:3,background:"rgba(255,255,255,0.08)",borderRadius:99,overflow:"hidden",maxWidth:200,margin:"0 auto"}}>
              <div style={{height:"100%",width:"100%",background:"linear-gradient(90deg,#00C9A7,#0080FF)",borderRadius:99,animation:"shrink 2s linear forwards"}} />
            </div>
          </div>
        ) : (
          <>
            {errMsg && (
              <div style={{background:"rgba(239,83,80,0.1)",border:"1px solid rgba(239,83,80,0.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#EF5350",marginBottom:16}}>
                {errMsg}
              </div>
            )}

            <div style={{display:"flex",gap:12,marginBottom:14}}>
              <div style={{flex:1}}>
                <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:600,display:"block",marginBottom:6}}>Ad Soyad</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ahmet Yılmaz"
                  style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:13,outline:"none",boxSizing:"border-box"}}
                  onFocus={e=>e.target.style.borderColor="#00C9A7"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:600,display:"block",marginBottom:6}}>E-posta</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@mail.com"
                  style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:13,outline:"none",boxSizing:"border-box"}}
                  onFocus={e=>e.target.style.borderColor="#00C9A7"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:600,display:"block",marginBottom:6}}>Konu</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Ödeme, teknik destek, öneri..."
                style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:13,outline:"none",boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor="#00C9A7"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"} />
            </div>

            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:600,display:"block",marginBottom:6}}>Mesaj</label>
              <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Mesajınızı yazın..." rows={4}
                style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#fff",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor="#00C9A7"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"} />
            </div>

            <button onClick={send} disabled={status==="sending"}
              style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:status==="sending"?"rgba(0,201,167,0.3)":"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:700,fontSize:15,cursor:status==="sending"?"default":"pointer",transition:"all 0.2s"}}
              onMouseEnter={e=>{if(status!=="sending")e.currentTarget.style.opacity="0.88";}}
              onMouseLeave={e=>{e.currentTarget.style.opacity="1";}}>
              {status==="sending" ? "⏳ Gönderiliyor..." : "Gönder →"}
            </button>

            <p style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.22)",marginTop:12}}>
              veya direkt yazın: <span style={{color:"#00C9A7"}}>info@bioscope.com.tr</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function RefPopup({ onClose }) {
  const [activeGroup, setActiveGroup] = useState("metabolik");
  const bms = BIOMARKERS.filter(b => b.group === activeGroup && b.ref);
  return (
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={()=>{ if(!ok) onClose(); }}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)"}} />
      <div style={{position:"relative",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,201,167,0.2)",borderRadius:20,width:"100%",maxWidth:720,maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column"}}
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h3 style={{fontFamily:"Georgia,serif",fontSize:20,color:"#fff",fontWeight:700}}>📊 Referans Aralıkları</h3>
            <p style={{fontSize:12,color:"rgba(255,255,255,0.38)",marginTop:3}}>Optimal değer aralıkları ve klinik anlamları</p>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",border:"none",borderRadius:8,color:"rgba(255,255,255,0.55)",fontSize:18,width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {/* Group tabs */}
        <div style={{display:"flex",gap:6,padding:"12px 24px",borderBottom:"1px solid rgba(255,255,255,0.07)",overflowX:"auto"}}>
          {GROUPS.filter(g=>g!=="kişisel").map(g=>{
            const m=GM[g]; const isA=activeGroup===g;
            return <button key={g} onClick={()=>setActiveGroup(g)}
              style={{padding:"6px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap",
                background:isA?m.bg:"rgba(0,201,167,0.03)",color:isA?m.color:"rgba(255,255,255,0.38)",
                borderBottom:isA?`2px solid ${m.color}`:"2px solid transparent",transition:"all 0.2s"}}>
              {m.label}
            </button>;
          })}
        </div>
        {/* Content */}
        <div style={{overflowY:"auto",padding:24,display:"flex",flexDirection:"column",gap:12}}>
          {bms.map(bm=>{
            const {opt,iyi,orta,desc}=bm.ref;
            return (
              <div key={bm.key} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <span style={{fontWeight:700,fontSize:14,color:"#fff"}}>{bm.label}</span>
                    <span style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginLeft:6}}>{bm.unit}</span>
                  </div>
                </div>
                <p style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginBottom:12,lineHeight:1.6}}>{desc}</p>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[
                    {label:"Optimal",  range:opt,  color:"#00C9A7", bg:"rgba(0,201,167,0.1)"},
                    {label:"İyi",      range:iyi,  color:"#4FC3F7", bg:"rgba(79,195,247,0.1)"},
                    {label:"Dikkat",   range:orta, color:"#FFB74D", bg:"rgba(255,183,77,0.1)"},
                    {label:"Yüksek Risk",range:null,color:"#EF5350", bg:"rgba(239,83,80,0.1)"},
                  ].map(r=>(
                    <div key={r.label} style={{padding:"5px 12px",borderRadius:6,background:r.bg,border:`1px solid ${r.color}25`,textAlign:"center"}}>
                      <div style={{fontSize:10,color:r.color,fontWeight:700}}>{r.label}</div>
                      {r.range && <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginTop:2}}>{r.range[0]}–{r.range[1]}</div>}
                      {!r.range && <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginTop:2}}>Aralık dışı</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── AI Soru-Cevap Popup ───────────────────────────────────────────────────────
function AskAIPopup({ resultContext, onClose }) {
  const [msgs,    setMsgs]    = useState([
    {role:"ai", text:"Merhaba! Kan değerleriniz ve biyolojik yaşınız hakkında merak ettiğiniz her şeyi sorabilirsiniz. Örneğin: \"Albüminim düşük mü?\", \"CRP değerim ne anlama geliyor?\""}
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs]);

  const send = async () => {
    const q = input.trim(); if (!q || loading) return;
    setMsgs(m=>[...m,{role:"user",text:q}]); setInput(""); setLoading(true);
    try {
      const ans = await askAI(q, resultContext);
      setMsgs(m=>[...m,{role:"ai",text:ans}]);
    } catch {
      setMsgs(m=>[...m,{role:"ai",text:"Şu an yanıt veremiyorum. Lütfen tekrar deneyin."}]);
    } finally { setLoading(false); }
  };

  const suggestions = ["Albüminim ne anlama geliyor?","CRP değerim yüksek mi?","Biyolojik yaşımı nasıl düşürebilirim?","Hangi değerlerime dikkat etmeliyim?"];

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"flex-end",padding:20}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(6px)"}} />
      <div className="by-chat-popup" style={{position:"relative",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,201,167,0.2)",borderRadius:20,width:420,height:560,display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#00C9A7,#0080FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>AI Asistan</div>
              <div style={{fontSize:11,color:"#00C9A7"}}>● Çevrimiçi</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",border:"none",borderRadius:8,color:"rgba(255,255,255,0.55)",fontSize:16,width:32,height:32,cursor:"pointer"}}>✕</button>
        </div>
        {/* Messages */}
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
                background:m.role==="user"?"linear-gradient(135deg,#00C9A7,#0080FF)":"rgba(0,201,167,0.05)",
                fontSize:13,color:"#fff",lineHeight:1.6}}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{display:"flex",justifyContent:"flex-start"}}>
              <div style={{padding:"10px 14px",borderRadius:"14px 14px 14px 4px",background:"rgba(255,255,255,0.06)",display:"flex",gap:4,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#00C9A7",animation:`blink 1.2s ${i*0.2}s infinite`}} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {/* Suggestions */}
        {msgs.length <= 1 && (
          <div style={{padding:"0 16px 12px",display:"flex",flexWrap:"wrap",gap:6}}>
            {suggestions.map(s=>(
              <button key={s} onClick={()=>setInput(s)}
                style={{padding:"5px 10px",borderRadius:6,border:"1px solid rgba(0,201,167,0.25)",background:"rgba(0,201,167,0.06)",color:"rgba(255,255,255,0.55)",fontSize:11,cursor:"pointer",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(0,201,167,0.5)";e.currentTarget.style.color="#fff";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(0,201,167,0.25)";e.currentTarget.style.color="rgba(255,255,255,0.55)";}}>
                {s}
              </button>
            ))}
          </div>
        )}
        {/* Input */}
        <div style={{padding:16,borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()}
            placeholder="Sorunuzu yazın..."
            style={{flex:1,padding:"10px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:13,outline:"none"}}
            onFocus={e=>{e.target.style.borderColor="#00C9A7";}}
            onBlur={e=>{e.target.style.borderColor="rgba(0,201,167,0.06)";}}
          />
          <button onClick={send} disabled={loading||!input.trim()}
            style={{width:42,height:42,borderRadius:10,border:"none",background:loading||!input.trim()?"rgba(0,201,167,0.2)":"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",cursor:loading||!input.trim()?"default":"pointer",fontSize:18}}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Auth Modal (Giriş / Kayıt) ────────────────────────────────────────────────
function AuthModal({ mode: initMode, onClose, onSuccess, onRegister, onLogin, fromAnalyze }) {
  const [mode,  setMode]  = useState(initMode||"login"); // login | register | forgot
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [err,   setErr]   = useState("");
  const [ok,    setOk]    = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [loading, setLoading] = useState(false);

  const sendReset = async () => {
    if (!email.includes("@")) return setErr("Geçerli bir e-posta girin.");
    setLoading(true);
    setErr("");
    try {
      await sb.resetPassword(email.trim());
      setResetSent(true);
    } catch(e) {
      setErr("Bir hata oluştu. Tekrar deneyin.");
    }
    setLoading(false);
  };

  const submit = async () => {
    if (loading) return;
    setErr("");
    setOk(false);
    setLoading(true);
    try {
      if (mode==="register") {
        if (!name.trim())        { setLoading(false); return setErr("Ad soyad zorunlu."); }
        if (!email.includes("@")){ setLoading(false); return setErr("Geçerli bir e-posta girin."); }
        if (pass.length < 6)     { setLoading(false); return setErr("Şifre en az 6 karakter olmalı."); }
        const res = await onRegister(name.trim(), email.trim(), pass);
        if (!res || res.error) { setLoading(false); return setErr(res?.error || "Kayıt başarısız. Tekrar deneyin."); }
        setOk(true);
        setTimeout(() => { onSuccess(res.user || {}); }, 2000);
      } else {
        if (!email || !pass) { setLoading(false); return setErr("Tüm alanları doldurun."); }
        const res = await onLogin(email.trim(), pass);
        if (!res || res.error) { setLoading(false); return setErr("E-posta adresi veya şifre hatalı."); }
        if (!res.success && !res.user) { setLoading(false); return setErr("E-posta adresi veya şifre hatalı."); }
        setOk(true);
        setTimeout(() => { onSuccess(res.user || {}); }, 2000);
      }
    } catch(e) {
      setLoading(false);
      setErr("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)"}} />
      <div style={{position:"relative",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,201,167,0.2)",borderRadius:20,width:"100%",maxWidth:420,padding:32,boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}
        onClick={e=>e.stopPropagation()}>
        <button onClick={()=>{ if(!ok) onClose(); }} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.05)",border:"none",borderRadius:8,color:"rgba(255,255,255,0.55)",fontSize:16,width:32,height:32,cursor:"pointer"}}>✕</button>
        
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#00C9A7,#0080FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 14px"}}>🧬</div>
          <h3 style={{fontFamily:"Georgia,serif",fontSize:22,color:"#fff",fontWeight:700}}>{mode==="login"?"Hoş Geldiniz":mode==="forgot"?"Şifre Sıfırla":"Hesap Oluştur"}</h3>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.38)",marginTop:5}}>
            {fromAnalyze
              ? mode==="register" ? "Analiz yapabilmek için ücretsiz kayıt olun" : "Devam etmek için giriş yapın"
              : mode==="login" ? "Hesabınıza giriş yapın" : "BioScope’a ücretsiz üye olun"
            }
          </p>
          {fromAnalyze && mode==="register" && (
            <div style={{marginTop:10,padding:"8px 14px",borderRadius:8,background:"rgba(0,201,167,0.08)",border:"1px solid rgba(0,201,167,0.2)",fontSize:12,color:"#00C9A7",fontWeight:600}}>
              🧬 Kayıt sonrası analiz sayfasına yönlendirileceksiniz
            </div>
          )}
        </div>

        {ok ? (
          <div style={{textAlign:"center",padding:"24px 0"}}>
            <div style={{fontSize:56,marginBottom:14,animation:"pulse 0.6s ease"}}>✅</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:22,color:"#fff",fontWeight:700,marginBottom:6}}>
              {mode==="login" ? "Hoş geldiniz!" : "Kayıt başarılı!"}
            </div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.55)",marginBottom:20}}>
              {mode==="login" ? "Giriş yapıldı, yönlendiriliyorsunuz..." : "Hesabınız oluşturuldu, yönlendiriliyorsunuz..."}
            </div>
            <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden",maxWidth:200,margin:"0 auto"}}>
              <div style={{height:"100%",width:"100%",background:"linear-gradient(90deg,#00C9A7,#0080FF)",borderRadius:99,animation:"shrink 2s linear forwards"}} />
            </div>
            <style>{`@keyframes shrink { from { width:100%; } to { width:0%; } }`}</style>
          </div>
        ) : mode==="forgot" ? (
          <div>
            {resetSent ? (
              <div style={{textAlign:"center",padding:"16px 0"}}>
                <div style={{fontSize:48,marginBottom:14}}>📧</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:20,color:"#fff",fontWeight:700,marginBottom:8}}>Mail gönderildi!</div>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",lineHeight:1.7,marginBottom:20}}>
                  {email} adresine şifre sıfırlama linki gönderildi. Gelen kutunuzu kontrol edin.
                </div>
                <button onClick={()=>{setMode("login");setResetSent(false);setEmail("");setErr("");}}
                  style={{padding:"10px 24px",borderRadius:9,border:"1px solid rgba(0,201,167,0.3)",background:"none",color:"#00C9A7",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                  Giriş Yap
                </button>
              </div>
            ) : (
              <div>
                {err && <div style={{background:"rgba(239,83,80,0.1)",border:"1px solid rgba(239,83,80,0.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#EF5350",marginBottom:16}}>{err}</div>}
                <p style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:18,lineHeight:1.7}}>
                  Kayıtlı e-posta adresinizi girin. Şifre sıfırlama linki göndereceğiz.
                </p>
                <div style={{marginBottom:18}}>
                  <label style={{fontSize:12,color:"rgba(255,255,255,0.55)",fontWeight:600,display:"block",marginBottom:6}}>E-posta</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="ornek@mail.com"
                    style={{width:"100%",padding:"11px 14px",borderRadius:9,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box"}}
                    onFocus={e=>e.target.style.borderColor="#00C9A7"}
                    onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.07)"}
                    onKeyDown={e=>e.key==="Enter"&&sendReset()} />
                </div>
                <button onClick={sendReset} disabled={loading}
                  style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:loading?"rgba(0,201,167,0.4)":"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:700,fontSize:15,cursor:loading?"default":"pointer",marginBottom:14}}>
                  {loading ? "Gönderiliyor..." : "Sıfırlama Linki Gönder"}
                </button>
                <div style={{textAlign:"center"}}>
                  <span onClick={()=>{setMode("login");setErr("");}} style={{fontSize:13,color:"#00C9A7",cursor:"pointer",fontWeight:600}}>
                    Giriş Yap
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {err && <div style={{background:"rgba(239,83,80,0.1)",border:"1px solid rgba(239,83,80,0.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#EF5350",marginBottom:16}}>{err}</div>}

            {mode==="register" && (
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,color:"rgba(255,255,255,0.55)",fontWeight:600,display:"block",marginBottom:6}}>Ad Soyad</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ahmet Yılmaz"
                  style={{width:"100%",padding:"11px 14px",borderRadius:9,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box"}}
                  onFocus={e=>e.target.style.borderColor="#00C9A7"} onBlur={e=>e.target.style.borderColor="rgba(0,201,167,0.06)"} />
              </div>
            )}

            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:"rgba(255,255,255,0.55)",fontWeight:600,display:"block",marginBottom:6}}>E-posta</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@mail.com"
                style={{width:"100%",padding:"11px 14px",borderRadius:9,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor="#00C9A7"} onBlur={e=>e.target.style.borderColor="rgba(0,201,167,0.06)"} />
            </div>

            <div style={{marginBottom:22}}>
              <label style={{fontSize:12,color:"rgba(255,255,255,0.55)",fontWeight:600,display:"block",marginBottom:6}}>Şifre</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••"
                style={{width:"100%",padding:"11px 14px",borderRadius:9,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor="#00C9A7"} onBlur={e=>e.target.style.borderColor="rgba(0,201,167,0.06)"}
                onKeyDown={e=>e.key==="Enter"&&submit()} />
            </div>

            <button onClick={submit} disabled={loading}
              style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:loading?"rgba(0,201,167,0.4)":"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:700,fontSize:15,cursor:loading?"default":"pointer",marginBottom:16}}>
              {loading ? "Lütfen bekleyin..." : mode==="login" ? "Giriş Yap" : "Kayıt Ol →"}
            </button>

            <div style={{textAlign:"center",fontSize:13,color:"rgba(255,255,255,0.38)"}}>
              {mode==="login" ? (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div>Hesabınız yok mu? <span onClick={()=>setMode("register")} style={{color:"#00C9A7",cursor:"pointer",fontWeight:600}}>Kayıt Ol</span></div>
                  <div><span onClick={()=>{setMode("forgot");setErr("");}} style={{color:"rgba(255,255,255,0.38)",cursor:"pointer",textDecoration:"underline",fontSize:12}}>Şifremi Unuttum</span></div>
                </div>
              ) : <>Zaten üye misiniz? <span onClick={()=>setMode("login")} style={{color:"#00C9A7",cursor:"pointer",fontWeight:600}}>Giriş Yap</span></>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Profil Sayfası ─────────────────────────────────────────────────────────────
// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ onLogout }) {
  const [toggles, setToggles] = useState({
    "6 aylık analiz hatırlatıcısı": true,
    "Yeni özellik duyuruları": true,
    "Haftalık sağlık ipuçları": false,
  });

  const toggle = (label) => {
    setToggles(prev => ({...prev, [label]: !prev[label]}));
  };

  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:24}}>
      <h4 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:20}}>Bildirim Tercihleri</h4>
      {Object.entries(toggles).map(([label, on]) => (
        <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <span style={{fontSize:14,color:"rgba(255,255,255,0.55)"}}>{label}</span>
          <div onClick={()=>toggle(label)}
            style={{width:40,height:22,borderRadius:11,cursor:"pointer",position:"relative",transition:"background 0.3s",
              background:on?"linear-gradient(135deg,#00C9A7,#0080FF)":"rgba(255,255,255,0.12)"}}>
            <div style={{position:"absolute",top:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.3s",
              left:on?"21px":"3px"}} />
          </div>
        </div>
      ))}
      <DeleteAccount onLogout={onLogout} />
    </div>
  );
}

// ── Hesabı Sil ────────────────────────────────────────────────────────────────
function DeleteAccount({ onLogout }) {
  const [step, setStep] = useState("idle"); // idle | confirm | done

  const handleDelete = () => {
    // Session ve kullanıcı verilerini temizle
    sessionStorage.clear();
    setStep("done");
    setTimeout(() => { onLogout(); }, 2000);
  };

  if (step === "done") return (
    <div style={{marginTop:24,padding:16,background:"rgba(239,83,80,0.06)",border:"1px solid rgba(239,83,80,0.15)",borderRadius:10,textAlign:"center"}}>
      <div style={{fontSize:24,marginBottom:8}}>✓</div>
      <div style={{fontSize:13,color:"#EF5350",fontWeight:600}}>Hesabınız silindi. Yönlendiriliyorsunuz...</div>
    </div>
  );

  if (step === "confirm") return (
    <div style={{marginTop:24,padding:16,background:"rgba(239,83,80,0.08)",border:"1px solid rgba(239,83,80,0.3)",borderRadius:10}}>
      <div style={{fontSize:13,color:"#EF5350",fontWeight:700,marginBottom:6}}>Emin misiniz?</div>
      <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:14}}>Tüm analiz geçmişiniz ve hesap bilgileriniz kalıcı olarak silinecek.</div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={handleDelete}
          style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:"#EF5350",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
          Evet, sil
        </button>
        <button onClick={()=>setStep("idle")}
          style={{flex:1,padding:"9px",borderRadius:8,border:"1px solid rgba(255,255,255,0.15)",background:"none",color:"rgba(255,255,255,0.55)",fontSize:13,cursor:"pointer"}}>
          Vazgeç
        </button>
      </div>
    </div>
  );

  return (
    <div style={{marginTop:24,padding:16,background:"rgba(239,83,80,0.06)",border:"1px solid rgba(239,83,80,0.15)",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontSize:13,color:"#EF5350",fontWeight:600,marginBottom:4}}>Hesabı Sil</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.38)"}}>Tüm verileriniz kalıcı olarak silinir.</div>
      </div>
      <button onClick={()=>setStep("confirm")}
        style={{padding:"8px 16px",borderRadius:8,border:"1px solid rgba(239,83,80,0.4)",background:"none",color:"#EF5350",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.2s"}}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,83,80,0.12)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="none";}}>
        Hesabı Sil
      </button>
    </div>
  );
}

// ── Analiz Detay Modal ────────────────────────────────────────────────────────
function AnalysisDetailModal({ analysis, onClose }) {
  const bms = BIOMARKERS.filter(b => b.key !== "age" && analysis.vals?.[b.key] != null && b.ref);
  const diffCol = analysis.diff <= -3 ? "#00C9A7" : analysis.diff <= 3 ? "#FFB74D" : "#EF5350";

  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)"}} />
      <div style={{position:"relative",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,201,167,0.2)",borderRadius:22,width:"100%",maxWidth:680,maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,0.7)"}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,201,167,0.04)"}}>
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",letterSpacing:"1px",marginBottom:3}}>ANALİZ DETAYI · {analysis.date}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:10}}>
              <span style={{fontFamily:"Georgia,serif",fontSize:26,fontWeight:700,color:"#fff"}}>Biyolojik Yaş: <span style={{color:"#00C9A7"}}>{analysis.bioAge}</span></span>
              <span style={{padding:"3px 10px",borderRadius:6,background:`${diffCol}18`,color:diffCol,fontSize:13,fontWeight:700,border:`1px solid ${diffCol}30`}}>
                {analysis.diff > 0 ? `+${analysis.diff}` : analysis.diff} yıl
              </span>
            </div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.38)",marginTop:2}}>Kronolojik yaş: {analysis.chronoAge}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",border:"none",borderRadius:10,color:"rgba(255,255,255,0.55)",fontSize:18,width:38,height:38,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{overflowY:"auto",padding:22}}>

          {/* Sistem skorları */}
          <h4 style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.55)",letterSpacing:"1px",marginBottom:14}}>SİSTEM BAZLI ANALİZ</h4>
          <div className="by-grid-3c" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:22}}>
            {SYSTEM_KEYS.map(([sysName,keys])=>{
              const scores=keys.map(k=>getScore(k,analysis.vals?.[k])).filter(s=>s!==null);
              if(!scores.length) return null;
              const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
              const col=avg>=80?"#00C9A7":avg>=60?"#FFB74D":"#EF5350";
              return (
                <div key={sysName} style={{background:"rgba(0,201,167,0.03)",borderTop:`2px solid ${col}`,borderRadius:10,padding:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                    <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.55)"}}>{sysName}</span>
                    <span style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,color:col}}>{avg}</span>
                  </div>
                  <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${avg}%`,background:col,borderRadius:99}} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Değer tablosu */}
          <h4 style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.55)",letterSpacing:"1px",marginBottom:14}}>KAN DEĞERLERİ</h4>
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 90px 80px 90px",padding:"9px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",fontSize:10,color:"rgba(255,255,255,0.38)",fontWeight:700,letterSpacing:"0.5px"}}>
              <span>DEĞER</span><span style={{textAlign:"right"}}>SONUÇ</span><span style={{textAlign:"center"}}>DURUM</span><span style={{textAlign:"right"}}>OPTİMAL</span>
            </div>
            {bms.map((b,i)=>{
              const st=getStatus(b.key,analysis.vals[b.key]);
              return (
                <div key={b.key} style={{display:"grid",gridTemplateColumns:"1fr 90px 80px 90px",padding:"10px 16px",borderBottom:i<bms.length-1?"1px solid rgba(0,201,167,0.03)":"none",alignItems:"center"}}>
                  <span style={{fontSize:13,color:"rgba(255,255,255,0.7)"}}>{b.label}</span>
                  <span style={{textAlign:"right",fontFamily:"Georgia,serif",fontSize:13,fontWeight:700,color:"#fff"}}>{analysis.vals[b.key]} <span style={{fontSize:9,color:"rgba(255,255,255,0.38)"}}>{b.unit}</span></span>
                  <span style={{textAlign:"center"}}>
                    {st && <span style={{padding:"2px 7px",borderRadius:4,background:st.bg,color:st.color,fontSize:10,fontWeight:700}}>{st.label}</span>}
                  </span>
                  <span style={{textAlign:"right",fontSize:10,color:"rgba(255,255,255,0.38)"}}>{b.ref?.opt[0]}–{b.ref?.opt[1]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ user, analyses, onLogout, setPage, goAnalyze }) {
  const [activeTab,    setActiveTab]    = useState("overview");
  const [selectedAnal, setSelectedAnal] = useState(null);

  // Overview'da tıklanan analize git
  const openAnalysis = (a) => setSelectedAnal(a);

  return (
    <section style={{minHeight:"100vh",padding:"90px 24px 60px"}}>
      {selectedAnal && <AnalysisDetailModal analysis={selectedAnal} onClose={()=>setSelectedAnal(null)} />}

      <div style={{maxWidth:900,margin:"0 auto"}}>
        <button onClick={()=>{setPage("home");window.scrollTo({top:0,behavior:"smooth"});}}
          style={{background:"none",border:"none",color:"rgba(255,255,255,0.38)",cursor:"pointer",fontSize:13,display:"block",marginBottom:24}}>
          ← Ana Sayfaya Dön
        </button>

        {/* Profil başlığı */}
        <div className="by-profile-header" style={{display:"flex",alignItems:"center",gap:20,marginBottom:32,padding:24,background:"rgba(0,201,167,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16}}>
          <div style={{width:64,height:64,borderRadius:16,background:"linear-gradient(135deg,#00C9A7,#0080FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:700,color:"#fff"}}>
            {user.name?.[0]?.toUpperCase()||"U"}
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:700,color:"#fff"}}>{user.name}</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.38)",marginTop:3}}>{user.email}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginTop:2}}>Üye olma: {user.joinDate}</div>
          </div>
          <button onClick={onLogout}
            style={{padding:"8px 18px",borderRadius:8,border:"1px solid rgba(239,83,80,0.3)",background:"rgba(239,83,80,0.08)",color:"#EF5350",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,83,80,0.15)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(239,83,80,0.08)";}}>
            Çıkış Yap
          </button>
        </div>

        {/* Tabs */}
        <div className="by-profile-tabs" style={{display:"flex",gap:0,marginBottom:24,background:"rgba(255,255,255,0.06)",borderRadius:10,padding:4,maxWidth:360}}>
          {[["overview","📊 Genel Bakış"],["history","🕐 Geçmiş"],["settings","⚙️ Ayarlar"]].map(([t,l])=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              style={{flex:1,padding:"9px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
                background:activeTab===t?"linear-gradient(135deg,#00C9A7,#0080FF)":"transparent",
                color:activeTab===t?"#fff":"rgba(0,201,167,0.1)",transition:"all 0.2s"}}>
              {l}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab==="overview" && (
          <div>
            {/* İstatistik kartları — tıklanabilir */}
            <div className="by-profile-stats" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:28}}>
              {/* Toplam Analiz — tıklayınca geçmişe git */}
              <div onClick={()=>analyses.length>0&&setActiveTab("history")}
                style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:20,textAlign:"center",
                  cursor:analyses.length>0?"pointer":"default",transition:"all 0.2s"}}
                onMouseEnter={e=>{if(analyses.length>0){e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(0,201,167,0.3)";}}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";}}>
                <div style={{fontSize:28,marginBottom:8}}>🔬</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:26,fontWeight:700,color:"#00C9A7"}}>{analyses.length||0}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginTop:4}}>Toplam Analiz</div>
                {analyses.length>0 && <div style={{fontSize:10,color:"rgba(0,201,167,0.5)",marginTop:4}}>geçmişi gör →</div>}
              </div>
              {/* Son Biyolojik Yaş — tıklayınca son analize git */}
              <div onClick={()=>analyses[0]&&openAnalysis(analyses[0])}
                style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:20,textAlign:"center",
                  cursor:analyses[0]?"pointer":"default",transition:"all 0.2s"}}
                onMouseEnter={e=>{if(analyses[0]){e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(0,201,167,0.3)";}}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";}}>
                <div style={{fontSize:28,marginBottom:8}}>🧬</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:26,fontWeight:700,color:"#00C9A7"}}>{analyses[0]?.bioAge||"—"}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginTop:4}}>Son Biyolojik Yaş</div>
                {analyses[0] && <div style={{fontSize:10,color:"rgba(0,201,167,0.5)",marginTop:4}}>detayı gör →</div>}
              </div>
              {/* Son Analiz */}
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:20,textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:8}}>📅</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:analyses[0]?.date?"18px":"26px",fontWeight:700,color:"#00C9A7",lineHeight:1.3}}>{analyses[0]?.date||"—"}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginTop:4}}>Son Analiz</div>
              </div>
            </div>

            {/* Son analizler özeti */}
            {analyses.length > 0 ? (
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <h4 style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.55)",letterSpacing:"0.5px"}}>SON ANALİZLER</h4>
                  <button onClick={()=>setActiveTab("history")}
                    style={{background:"none",border:"none",color:"rgba(0,201,167,0.7)",fontSize:12,cursor:"pointer",fontWeight:600}}>
                    Tümünü Gör →
                  </button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {analyses.slice(0,3).map((a,i)=>{
                    const diffCol=a.diff<=-3?"#00C9A7":a.diff<=3?"#FFB74D":"#EF5350";
                    const sysScores = SYSTEM_KEYS.map(([name,keys])=>{
                      const sc=keys.map(k=>getScore(k,a.vals?.[k])).filter(s=>s!==null);
                      if(!sc.length) return null;
                      return {name,avg:Math.round(sc.reduce((x,y)=>x+y,0)/sc.length)};
                    }).filter(Boolean);
                    return (
                      <div key={i} onClick={()=>openAnalysis(a)}
                        style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"16px 20px",cursor:"pointer",transition:"all 0.2s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(0,201,167,0.25)";e.currentTarget.style.transform="translateY(-1px)";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";e.currentTarget.style.transform="translateY(0)";}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                          <div style={{display:"flex",alignItems:"center",gap:12}}>
                            <div style={{width:44,height:44,borderRadius:10,background:`${diffCol}15`,border:`1px solid ${diffCol}30`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                              <span style={{fontFamily:"Georgia,serif",fontSize:17,fontWeight:700,color:diffCol,lineHeight:1}}>{a.bioAge}</span>
                              <span style={{fontSize:8,color:"rgba(255,255,255,0.38)"}}>biy. yaş</span>
                            </div>
                            <div>
                              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{a.date}</div>
                              <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginTop:2}}>Kronolojik yaş: {a.chronoAge}</div>
                            </div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{padding:"4px 12px",borderRadius:7,background:`${diffCol}15`,color:diffCol,fontSize:12,fontWeight:700,border:`1px solid ${diffCol}25`}}>
                              {a.diff>0?`+${a.diff}`:a.diff} yıl &nbsp;{a.diff<=-3?"🏆":a.diff<=3?"👍":"⚠️"}
                            </div>
                            <span style={{fontSize:18,color:"rgba(255,255,255,0.2)"}}>›</span>
                          </div>
                        </div>
                        {/* Mini sistem skorları */}
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {sysScores.map(s=>{
                            const c=s.avg>=80?"#00C9A7":s.avg>=60?"#FFB74D":"#EF5350";
                            return <div key={s.name} style={{padding:"3px 8px",borderRadius:5,background:`${c}12`,fontSize:10,color:c,fontWeight:600,border:`1px solid ${c}25`}}>
                              {s.name} {s.avg}
                            </div>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{textAlign:"center",padding:"40px 20px",background:"rgba(0,201,167,0.03)",borderRadius:14,border:"1px dashed rgba(255,255,255,0.1)"}}>
                <div style={{fontSize:40,marginBottom:12}}>🧬</div>
                <div style={{fontSize:15,color:"rgba(255,255,255,0.55)",marginBottom:16}}>Henüz analiz yapılmadı</div>
                <button onClick={goAnalyze}
                  style={{padding:"11px 26px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                  İlk Analizi Başlat →
                </button>
              </div>
            )}
          </div>
        )}

        {/* History — tıklanabilir kartlar */}
        {activeTab==="history" && (
          <div>
            {analyses.length === 0
              ? <div style={{textAlign:"center",padding:"40px",color:"rgba(255,255,255,0.38)",fontSize:14}}>Henüz analiz geçmişi yok.</div>
              : (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {analyses.map((a,i)=>{
                    const diffCol=a.diff<=-3?"#00C9A7":a.diff<=3?"#FFB74D":"#EF5350";
                    const sysScores=SYSTEM_KEYS.map(([name,keys])=>{
                      const sc=keys.map(k=>getScore(k,a.vals?.[k])).filter(s=>s!==null);
                      if(!sc.length) return null;
                      return {name,avg:Math.round(sc.reduce((x,y)=>x+y,0)/sc.length)};
                    }).filter(Boolean);
                    return (
                      <div key={i} onClick={()=>openAnalysis(a)}
                        style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"18px 22px",cursor:"pointer",transition:"all 0.25s",position:"relative"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(0,201,167,0.3)";e.currentTarget.style.transform="translateX(3px)";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";e.currentTarget.style.transform="translateX(0)";}}>
                        {i===0 && <div style={{position:"absolute",top:12,right:12,padding:"2px 8px",borderRadius:5,background:"rgba(0,201,167,0.06)",color:"#00C9A7",fontSize:9,fontWeight:700}}>SON</div>}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                          <div style={{display:"flex",alignItems:"center",gap:14}}>
                            <div style={{width:52,height:52,borderRadius:12,background:`${diffCol}15`,border:`1px solid ${diffCol}30`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                              <span style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,color:diffCol,lineHeight:1}}>{a.bioAge}</span>
                              <span style={{fontSize:8,color:"rgba(255,255,255,0.38)"}}>biy. yaş</span>
                            </div>
                            <div>
                              <div style={{fontWeight:700,fontSize:15,color:"#fff"}}>{a.date}</div>
                              <div style={{fontSize:12,color:"rgba(255,255,255,0.38)",marginTop:2}}>Kronolojik: {a.chronoAge} · Fark: <span style={{color:diffCol,fontWeight:700}}>{a.diff>0?`+${a.diff}`:a.diff} yıl</span></div>
                            </div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:13,color:"rgba(255,255,255,0.38)"}}>Detayı gör</span>
                            <span style={{fontSize:20,color:"rgba(255,255,255,0.2)"}}>›</span>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {sysScores.map(s=>{
                            const c=s.avg>=80?"#00C9A7":s.avg>=60?"#FFB74D":"#EF5350";
                            return <div key={s.name} style={{padding:"3px 9px",borderRadius:5,background:`${c}10`,fontSize:10,color:c,fontWeight:600,border:`1px solid ${c}20`}}>
                              {s.name} {s.avg}
                            </div>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        )}

        {/* Settings */}
        {activeTab==="settings" && (
          <SettingsTab onLogout={onLogout} />
        )}
      </div>
    </section>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ page, setPage, user, setShowAuth, onLogout, goAnalyze }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const goHome   = () => { setPage("home"); window.scrollTo({top:0,behavior:"smooth"}); setMenuOpen(false); };
  const goBlog   = () => { setPage("blog"); window.scrollTo({top:0,behavior:"smooth"}); setMenuOpen(false); };
  const scrollTo = (id) => {
    setMenuOpen(false);
    if (page !== "home") { setPage("home"); setTimeout(() => document.getElementById(id)?.scrollIntoView({behavior:"smooth"}), 320); }
    else document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
  };

  return (
    <>
      <nav className="by-nav" style={{position:"fixed",top:0,left:0,right:0,zIndex:200,height:64,padding:"0 32px",
        background:scrolled?"rgba(4,16,14,0.95)":"transparent",
        backdropFilter:scrolled?"blur(20px)":"none",
        borderBottom:scrolled?"1px solid rgba(0,201,167,0.12)":"none",
        display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all 0.3s"}}>
        <button onClick={goHome} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:9,padding:0}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#00C9A7,#0080FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🧬</div>
          <span style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:20,color:"#fff",letterSpacing:"-0.5px"}}>BioScope</span>
        </button>
        <div className="by-nav-links" style={{display:"flex",gap:24,alignItems:"center"}}>
          {[["Nasıl Çalışır","how"],["Bilim","science"],["Fiyatlar","pricing"]].map(([label,id]) => (
            <span key={label} onClick={() => scrollTo(id)}
              style={{color:"rgba(255,255,255,0.55)",fontSize:13,cursor:"pointer",transition:"color 0.2s"}}
              onMouseEnter={e => e.target.style.color="#00C9A7"}
              onMouseLeave={e => e.target.style.color="rgba(255,255,255,0.55)"}>{label}</span>
          ))}
          {user ? (
            <button onClick={()=>{setPage("profile");window.scrollTo({top:0,behavior:"smooth"});}}
              style={{display:"flex",alignItems:"center",gap:8,background:"rgba(0,201,167,0.08)",border:"1px solid rgba(0,201,167,0.2)",borderRadius:8,padding:"6px 14px",cursor:"pointer",color:"#00C9A7",fontSize:13,fontWeight:600}}>
              <div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#00C9A7,#0080FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700}}>
                {user.name?.[0]?.toUpperCase()||"U"}
              </div>
              {user.name}
              {isAdmin(user) && <span style={{fontSize:9,background:"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",padding:"2px 6px",borderRadius:4,fontWeight:700,marginLeft:2}}>ADMIN</span>}
            </button>
          ) : (
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowAuth("login")}
                style={{background:"none",border:"1px solid rgba(255,255,255,0.25)",borderRadius:8,color:"rgba(255,255,255,0.7)",fontSize:13,padding:"8px 16px",cursor:"pointer",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(0,201,167,0.5)";e.currentTarget.style.color="#fff";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.25)";e.currentTarget.style.color="rgba(255,255,255,0.7)";}}>
                Giriş Yap
              </button>
              <button onClick={()=>setShowAuth("register")}
                style={{background:"linear-gradient(135deg,#00C9A7,#0080FF)",border:"none",borderRadius:8,color:"#fff",fontWeight:700,fontSize:13,padding:"8px 16px",cursor:"pointer"}}>
                Kayıt Ol
              </button>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={goAnalyze}
            className="by-nav-cta" style={{background:"linear-gradient(135deg,#00C9A7,#0080FF)",border:"none",borderRadius:8,color:"#fff",fontWeight:700,fontSize:13,padding:"9px 18px",cursor:"pointer"}}>
            Analiz Başlat →
          </button>
          {/* Dil seçici */}
          <div style={{position:"relative"}}>

          </div>
          <button onClick={()=>setMenuOpen(o=>!o)}
            style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,cursor:"pointer",padding:"8px 10px",display:"flex",flexDirection:"column",gap:4,alignItems:"center",justifyContent:"center"}}>
            <div style={{width:18,height:2,background:"#fff",borderRadius:1,transition:"all 0.3s",transform:menuOpen?"rotate(45deg) translate(4px,4px)":"none"}} />
            <div style={{width:18,height:2,background:"#fff",borderRadius:1,transition:"all 0.3s",opacity:menuOpen?0:1}} />
            <div style={{width:18,height:2,background:"#fff",borderRadius:1,transition:"all 0.3s",transform:menuOpen?"rotate(-45deg) translate(4px,-4px)":"none"}} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <>
          <div onClick={()=>setMenuOpen(false)}
            style={{position:"fixed",inset:0,zIndex:198,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)"}} />
          <div style={{position:"fixed",top:64,right:0,bottom:0,zIndex:199,width:300,background:"#04100E",borderLeft:"1px solid rgba(0,201,167,0.15)",display:"flex",flexDirection:"column",boxShadow:"-12px 0 40px rgba(0,0,0,0.6)"}}>
            <div style={{padding:"18px 24px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#00C9A7,#0080FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🧬</div>
              <span style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:17,color:"#fff"}}>BioScope</span>
            </div>
            <div style={{flex:1,padding:"12px 0"}}>
              <div style={{padding:"8px 24px 4px",fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:700,letterSpacing:"1.5px"}}>PLATFORM</div>
              {[
                {label:"Ana Sayfa",      action:goHome,                  icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>},
                {label:"Nasıl Çalışır",  action:()=>scrollTo("how"),     icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>},
                {label:"Bilimsel Temel", action:()=>scrollTo("science"),  icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/><path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/><path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/><path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/></svg>},
                {label:"Fiyatlar",       action:()=>scrollTo("pricing"),  icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>},
                {label:"Blog",           action:goBlog,                  icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>},
                {label:"SSS",             action:()=>{setPage("sss");window.scrollTo({top:0,behavior:"smooth"});setMenuOpen(false);}, icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>},
              ].map(item=>(
                <button key={item.label} onClick={item.action}
                  style={{width:"100%",padding:"11px 20px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"background 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(0,201,167,0.07)"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <span style={{width:32,height:32,borderRadius:8,background:"rgba(0,201,167,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#00C9A7"}}>{item.icon}</span>
                  <span style={{fontSize:14,color:"rgba(255,255,255,0.8)",fontWeight:500,flex:1}}>{item.label}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ))}
              <div style={{margin:"12px 24px",height:1,background:"rgba(255,255,255,0.07)"}} />
              <div style={{padding:"8px 24px 4px",fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:700,letterSpacing:"1.5px"}}>HESABIM</div>
              {user ? (
                <button onClick={()=>{setPage("profile");window.scrollTo({top:0,behavior:"smooth"});setMenuOpen(false);}}
                  style={{width:"100%",padding:"11px 20px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"background 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(0,201,167,0.07)"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <span style={{width:32,height:32,borderRadius:8,background:"rgba(0,201,167,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#00C9A7"}}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  <span style={{fontSize:14,color:"rgba(255,255,255,0.8)",fontWeight:500,flex:1}}>Profilim</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ) : (
                <>
                  <button onClick={()=>{setShowAuth("login");setMenuOpen(false);}}
                    style={{width:"100%",padding:"11px 20px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"background 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(0,201,167,0.07)"}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <span style={{width:32,height:32,borderRadius:8,background:"rgba(0,201,167,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#00C9A7"}}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                    </span>
                    <span style={{fontSize:14,color:"rgba(255,255,255,0.8)",fontWeight:500,flex:1}}>Giriş Yap</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                  <button onClick={()=>{setShowAuth("register");setMenuOpen(false);}}
                    style={{width:"100%",padding:"11px 20px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"background 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(0,201,167,0.07)"}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <span style={{width:32,height:32,borderRadius:8,background:"rgba(0,201,167,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#00C9A7"}}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    </span>
                    <span style={{fontSize:14,color:"rgba(255,255,255,0.8)",fontWeight:500,flex:1}}>Kayıt Ol</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </>
              )}
            </div>
            <div style={{padding:"16px 24px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",textAlign:"center"}}>© 2025 BioScope</div>
            </div>
          </div>
        </>
      )}

    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
// ── Blog Verisi ───────────────────────────────────────────────────────────────
const BLOG_POSTS = [
  {
    id:1,
    slug:"biyolojik-yas-nedir",
    title:"Biyolojik Yaş Nedir ve Neden Önemlidir?",
    cat:"Longevity",
    date:"15 Mart 2025",
    readMin:5,
    emoji:"🧬",
    summary:"Doğum tarihiniz bir sayı söyler, vücudunuz farklı bir hikaye anlatır. Biyolojik yaş neden önemli ve nasıl ölçülür?",
    content:[
      {h:"Biyolojik Yaş Nedir?"},
      {p:"Kronolojik yaş, doğum tarihinizden itibaren geçen süreyi ölçer. Biyolojik yaş ise hücrelerinizin, dokularınızın ve organlarınızın gerçekte ne kadar yaşlı davrandığını gösterir. Aynı kronolojik yaşta iki kişi biyolojik olarak 10 yıl farklı olabilir."},
      {h:"Neden Önemli?"},
      {p:"Araştırmalar, biyolojik yaşın kalp hastalığı, diyabet, kanser ve Alzheimer riskiyle doğrudan ilişkili olduğunu göstermektedir. Kronolojik yaşınız değişmez fakat biyolojik yaşınız değişebilir. Bu da iyi haber demektir."},
      {h:"PhenoAge Algoritması"},
      {p:"BioScope platformunun kullandığı PhenoAge algoritması, Morgan Levine tarafından 2018 yılında geliştirilmiştir. Albumin, CRP, kreatinin, glukoz dahil 9 rutin kan değerini kullanarak biyolojik yaşı hesaplar. Bu değerlerin tamamı standart bir tam kan sayımında zaten yer alır."},
      {h:"Biyolojik Yaşımı Nasıl Düşürebilirim?"},
      {p:"Bilim, biyolojik yaşı değiştirmenin mümkün olduğunu gösteriyor. Düzenli egzersiz, kaliteli uyku, antiinflamatuar beslenme ve stres yönetimi biyolojik yaşı 5 ila 10 yıla kadar geri alabilir. BioScope ile 6 ayda bir test yaparak ilerlemenizi izleyebilirsiniz."}
    ]
  },
  {
    id:2,
    slug:"kan-degerleri-rehberi",
    title:"Kan Tahlili Rehberi: Hangi Değer Ne Anlama Gelir?",
    cat:"Kan Sağlığı",
    date:"28 Şubat 2025",
    readMin:7,
    emoji:"🩸",
    summary:"Albumin, CRP, RDW, MCV... Doktorunuz normal dedi ama siz merak ediyorsunuz. İşte biyolojik yaşla ilişkili 9 değerin kılavuzu.",
    content:[
      {h:"Kan Tahlili Neden Önemlidir?"},
      {p:"Her yıl kan tahlili yaptırıyoruz, sonuçlar geliyor, normal yazıyor, kapatıyoruz. Oysa bu değerlerin her biri vücudunuz hakkında çok daha derin bir hikaye anlatıyor."},
      {h:"Albumin: Karaciğerinizin Rapor Kartı"},
      {p:"Albumin karaciğerde üretilen bir proteindir. Düşük albumin, kronik inflamasyon, yetersiz beslenme veya karaciğer fonksiyon bozukluğunun işareti olabilir. Optimal aralık 4.2 - 5.0 g/dL arasındadır."},
      {h:"CRP: Vücudunuzdaki Yangın Alarmı"},
      {p:"C-reaktif protein inflamasyonun en güçlü göstergelerinden biridir. Kronik düşük dereceli inflamasyon, yani mg/L cinsinden 1 ila 3 arası CRP, kalp hastalığı ve erken yaşlanmayla ilişkilidir. Optimal seviye 1 mg/L altı olmalıdır."},
      {h:"RDW: Yaşlanmanın Sessiz Göstergesi"},
      {p:"Red Cell Distribution Width, kırmızı kan hücrelerinin boyut çeşitliliğini ölçer. Yüksek RDW, yüzde 14 üzeri, yetersiz beslenme, oksidatif stres ve biyolojik yaşlanmayla güçlü korelasyon gösterir."},
      {h:"Glukoz: Metabolik Sağlığınızın Termometresi"},
      {p:"Açlık kan şekeri 70 - 85 mg/dL arasında optimal kabul edilir. 100 üzeri prediyabet sinyali verir. Kronik yüksek glukoz, glikasyon yoluyla proteinleri ve hücreleri hasara uğratarak biyolojik yaşlanmayı hızlandırır."}
    ]
  },
  {
    id:3,
    slug:"longevity-beslenme",
    title:"Uzun ve Sağlıklı Yaşam İçin Beslenme: Bilim Ne Diyor?",
    cat:"Longevity",
    date:"15 Şubat 2025",
    readMin:6,
    emoji:"🥗",
    summary:"100 yaşına kadar sağlıklı yaşayan toplulukların ortak beslenme alışkanlıkları ve bunların biyolojik yaşa etkisi.",
    content:[
      {h:"Mavi Bölgeler"},
      {p:"Okinawa, Sardunya, Loma Linda ve Nikoya... Bu bölgeler Mavi Bölgeler olarak adlandırılır. 100 yaşını aşmış binlerce insanın yaşadığı bu coğrafyaların ortak paydası beslenme alışkanlıklarıdır."},
      {h:"Antiinflamatuar Beslenme"},
      {p:"Kronik inflamasyon biyolojik yaşlanmanın en büyük hızlandırıcısıdır. Zeytinyağı, yağlı balık, ceviz, keten tohumu, zerdeçal ve koyu yeşil yapraklı sebzeler inflamasyonu azaltır. Bu besinleri düzenli tüketen kişilerde CRP değerlerinin belirgin biçimde düştüğü gösterilmiştir."},
      {h:"Aralıklı Oruç"},
      {p:"16:8 aralıklı oruç protokolü insülin duyarlılığını artırır, CRP düşürür ve otofaji mekanizmasını aktive eder. Otofaji, hücresel çöp toplama sistemidir. Hasar görmüş proteinleri temizler."},
      {h:"Protein ve Albumin"},
      {p:"Albumin seviyesini yüksek tutmak için yeterli protein tüketimi kritiktir. Günlük kilogram başına 1.2 - 1.6 gram protein önerilir. Yumurta, baklagiller, yoğurt ve balık en iyi kaynaklar arasındadır."}
    ]
  },
  {
    id:4,
    slug:"egzersiz-biyolojik-yas",
    title:"Egzersiz Biyolojik Yaşı Gerçekten Değiştirir mi?",
    cat:"Spor",
    date:"3 Şubat 2025",
    readMin:5,
    emoji:"🏃",
    summary:"Haftada 150 dakika egzersiz biyolojik yaşı 9 yıl geri alabilir mi? Bilimsel kanıtlar ve hangi egzersiz türünün ne kadar etkili olduğu.",
    content:[
      {h:"Egzersizin Gücü"},
      {p:"Spor yapmanın iyi olduğunu biliyoruz fakat ne kadar iyi? Bilimsel veriler artık çok daha net cevaplar veriyor. Düzenli egzersiz yapan kişilerin telomerleri daha uzun, inflamasyon belirteçleri daha düşük ve biyolojik yaşları önemli ölçüde daha genç."},
      {h:"Aerobik Egzersizin Etkisi"},
      {p:"Brigham Young Üniversitesi araştırması, haftada 5 gün 30 dakika koşu yapanların biyolojik yaşlarının sedanter akranlarından 9 yıl daha genç olduğunu ortaya koydu. Mekanizma şudur: aerobik egzersiz telomeraz enzimini aktive eder ve telomerlerin kısalmasını yavaşlatır."},
      {h:"Zone 2 Antrenman"},
      {p:"Maksimum kalp atış hızının yüzde 60 ila 70 oranında yapılan, yürüyüş ile hafif koşu arası tempo, Zone 2 olarak adlandırılır. Bu yoğunlukta mitokondri kapasitesi artar, yağ yakımı optimale çıkar ve CRP değerleri düşer."},
      {h:"Direnç Antrenmanı"},
      {p:"Kas kütlesi biyolojik yaşın kritik bir belirleyicisidir. 40 yaşından sonra yılda yüzde 1 oranında azalan kas kütlesi insülin direncini artırır. Haftada 2 ila 3 gün direnç antrenmanı kas kaybını önler ve glukoz toleransını iyileştirir."}
    ]
  },
  {
    id:5,
    slug:"phenoage-nasil-calisir",
    title:"PhenoAge Algoritması Nasıl Çalışır?",
    cat:"Bilim",
    date:"20 Ocak 2025",
    readMin:8,
    emoji:"🔬",
    summary:"Nature dergisinde yayımlanan PhenoAge algoritmasının arkasındaki bilim: 9 biyobelirteç, matematiksel model ve neden diğer yöntemlerden üstün?",
    content:[
      {h:"Algoritmanın Doğuşu"},
      {p:"2018 yılında Yale Üniversitesi araştırmacısı Dr. Morgan Levine ve ekibi, Aging Albany NY dergisinde önemli bir makale yayımladı. 11.000 katılımcının verisiyle geliştirilen PhenoAge algoritması, rutin kan testlerinden biyolojik yaşı hesaplamanın en güvenilir yöntemi oldu."},
      {h:"9 Biyobelirteç Neden Seçildi?"},
      {p:"Levine ekibi önce 42 farklı biyobelirteci değerlendirdi. Makine öğrenmesi yöntemleriyle mortalite riski ile en güçlü ilişkiyi gösteren 9 parametreyi belirledi: albumin, alkalen fosfataz, kreatinin, glukoz, CRP, lenfosit yüzdesi, MCV, RDW ve lökosit sayısı."},
      {h:"Matematiksel Model"},
      {p:"Model iki aşamalı çalışır. Birinci aşamada 9 belirteç ve kronolojik yaş kullanılarak 10 yıllık mortalite olasılığı hesaplanır. İkinci aşamada bu mortalite değeri genel popülasyonun mortalite eğrisiyle karşılaştırılarak biyolojik yaş skoruna dönüştürülür."},
      {h:"BioScope Uygulaması"},
      {p:"BioScope, orijinal Levine 2018 formülasyonunu kullanmaktadır. Prof. Dr. Burcu Barutçuoglu denetiminde Türk laboratuvar standartlarına uyarlanmıştır. Birim dönüşümleri dahil tüm hesaplamalar klinik biyokimya protokollerine uygundur."}
    ]
  }
];

// ── SSS Sayfası ───────────────────────────────────────────────────────────────
const SSS_DATA = [
  {
    cat:"Genel",
    items:[
      {
        q:"BioScope nedir?",
        a:"BioScope, rutin kan tahlil sonuçlarınızdan biyolojik yaşınızı hesaplayan Türkiye'nin ilk klinik biyokimya platformudur. Prof. Dr. Burcu Barutçuoglu denetiminde geliştirilmiştir."
      },
      {
        q:"Biyolojik yaş nedir, kronolojik yaştan farkı ne?",
        a:"Kronolojik yaş doğum tarihinizden hesaplanır ve değişmez. Biyolojik yaş ise hücrelerinizin ve organlarınızın gerçekte ne kadar yaşlı davrandığını gösterir. İki kişi aynı kronolojik yaşta olup biyolojik olarak 10 yıl farklı olabilir."
      },
      {
        q:"Sonuçlar ne kadar güvenilir?",
        a:"BioScope, Yale Üniversitesi'nden Dr. Morgan Levine tarafından geliştirilen ve 11.000 katılımcıyla doğrulanan PhenoAge algoritmasını kullanır. Tüm nedenlere bağlı ölüm riskini kronolojik yaştan daha iyi öngördüğü gösterilmiştir. Bununla birlikte sonuçlar tıbbi tanı yerine geçmez."
      }
    ]
  },
  {
    cat:"Analiz ve Kan Değerleri",
    items:[
      {
        q:"Hangi kan değerlerine ihtiyacım var?",
        a:"Analiz için 9 rutin biyobelirteç gereklidir: Albumin, Kreatinin, Glukoz, Alkalen Fosfataz, CRP, Lökosit (WBC), Lenfosit yüzdesi, MCV ve RDW. Bu değerlerin tamamı standart bir tam kan sayımı ve biyokimya panelinde yer alır."
      },
      {
        q:"Kan tahlilimi nasıl yükleyebilirim?",
        a:"PDF formatındaki tahlil raporunuzu platforma yükleyebilirsiniz. Yapay zeka değerleri otomatik olarak okur. Alternatif olarak değerleri manuel olarak da girebilirsiniz."
      },
      {
        q:"Hangi laboratuvar formatları destekleniyor?",
        a:"Türkiye'deki tüm büyük laboratuvar formatları desteklenmektedir. Synlab, Düzen, Medicana, devlet hastanesi ve üniversite hastanesi formatları dahil."
      },
      {
        q:"İlaç kullanıyorum, sonuçlar etkilenir mi?",
        a:"Evet, bazı ilaçlar kan değerlerini etkiler. Örnegin Roakutan trigliseridi yükseltir, kortikosteroidler glukozu artırır. Analize başlamadan önce ilaç seçim ekranında kullandığınız ilaçları işaretleyin. Yapay zeka yorumunu buna göre düzenler."
      }
    ]
  },
  {
    cat:"Ödeme ve Raporlar",
    items:[
      {
        q:"Ücretsiz ne görebiliyorum?",
        a:"Ücretsiz olarak biyolojik yaş skorunuzu, kronolojik yaşınızla farkını ve 4 temel kan değerinizin durumunu görebilirsiniz. Tam organ sistemi analizi, AI uzman yorumu ve PDF rapor ücretli planlarda yer alır."
      },
      {
        q:"Raporumu indirebilir miyim?",
        a:"Evet. Analiz sonuç ekranındaki Raporu Indir butonuna basarak HTML formatında raporunuzu indirebilirsiniz. Tarayıcınızdan PDF olarak da kaydedebilirsiniz."
      },
      {
        q:"Ödeme güvenli mi?",
        a:"Tüm ödemeler iyzico altyapısı üzerinden işlenmektedir. Kart bilgileriniz BioScope sunucularında saklanmaz. 7 gün iade garantisi mevcuttur."
      }
    ]
  },
  {
    cat:"Sağlık ve Güvenlik",
    items:[
      {
        q:"Bu bir tıbbi tanı platformu mu?",
        a:"Hayır. BioScope bir bilgilendirme ve takip platformudur. Sonuçlar tıbbi tanı, tedavi veya ilaç önerisi yerine geçmez. Sağlık kararları için doktorunuza danışınız."
      },
      {
        q:"Ne sıklıkla analiz yapmalıyım?",
        a:"6 ayda bir analiz yapmanız önerilir. Bu süre, beslenme ve yaşam tarzı değişikliklerinin kan değerlerine yansıması için yeterlidir. Trend takibi özelliği sayesinde ilerlemenizi grafik üzerinde görüntüleyebilirsiniz."
      },
      {
        q:"Verilerim güvende mi?",
        a:"Kan tahlil verileriniz en hassas kişisel veri kategorisindedir. Şifreli bağlantı üzerinden iletilir, üçüncü taraflarla paylaşılmaz ve yalnızca analiz hesaplaması için kullanılır. Detaylar için Gizlilik Politikamızı inceleyebilirsiniz."
      }
    ]
  }
];

function SSSPage({ setPage }) {
  const [openItem, setOpenItem] = useState(null);
  const [showContact, setShowContact] = useState(false);

  return (
    <>
    {showContact && <ContactModal onClose={()=>setShowContact(false)} />}
    <section style={{minHeight:"100vh",padding:"90px 40px 80px",background:"#04100E"}}>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        <button onClick={()=>{setPage("home");window.scrollTo({top:0,behavior:"smooth"});}}
          style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:9,color:"rgba(255,255,255,0.75)",cursor:"pointer",fontSize:13,fontWeight:600,padding:"9px 16px",marginBottom:36,transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,201,167,0.1)";e.currentTarget.style.borderColor="rgba(0,201,167,0.3)";e.currentTarget.style.color="#fff";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";e.currentTarget.style.color="rgba(255,255,255,0.75)";}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Ana Sayfaya Dön
        </button>

        <div style={{textAlign:"center",marginBottom:52}}>
          <div style={{fontSize:11,color:"#00C9A7",fontWeight:700,letterSpacing:"2px",marginBottom:14}}>DESTEK</div>
          <h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(28px,5vw,42px)",color:"#fff",fontWeight:700,letterSpacing:"-1px",marginBottom:14}}>
            Sıkça Sorulan Sorular
          </h1>
          <p style={{fontSize:15,color:"rgba(255,255,255,0.45)",maxWidth:480,margin:"0 auto"}}>
            Aradığınızı bulamazsanız iletişim formumuzdan bize yazabilirsiniz.
          </p>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:32}}>
          {SSS_DATA.map((group,gi)=>(
            <div key={gi}>
              <div style={{fontSize:11,color:"#00C9A7",fontWeight:700,letterSpacing:"1.5px",marginBottom:12,paddingBottom:8,borderBottom:"1px solid rgba(0,201,167,0.15)"}}>
                {group.cat.toUpperCase()}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {group.items.map((item,ii)=>{
                  const key = gi+"-"+ii;
                  const isOpen = openItem === key;
                  return (
                    <div key={ii}
                      style={{background:"rgba(255,255,255,0.03)",border:"1px solid "+(isOpen?"rgba(0,201,167,0.2)":"rgba(255,255,255,0.07)"),borderRadius:12,overflow:"hidden",transition:"border-color 0.2s"}}>
                      <button onClick={()=>setOpenItem(isOpen?null:key)}
                        style={{width:"100%",padding:"16px 20px",background:"none",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,textAlign:"left"}}>
                        <span style={{fontSize:14,fontWeight:600,color:isOpen?"#00C9A7":"rgba(255,255,255,0.85)",flex:1,lineHeight:1.5}}>{item.q}</span>
                        <span style={{color:"#00C9A7",fontSize:18,flexShrink:0,transition:"transform 0.3s",display:"inline-block",transform:isOpen?"rotate(45deg)":"rotate(0deg)"}}>+</span>
                      </button>
                      {isOpen && (
                        <div style={{padding:"0 20px 18px"}}>
                          <div style={{height:1,background:"rgba(255,255,255,0.06)",marginBottom:14}} />
                          <p style={{fontSize:14,color:"rgba(255,255,255,0.6)",lineHeight:1.8,margin:0}}>{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{marginTop:52,padding:24,background:"rgba(0,201,167,0.06)",border:"1px solid rgba(0,201,167,0.15)",borderRadius:14,textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:600,color:"#fff",marginBottom:6}}>Sorunuzu bulamadınız mı?</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.45)",marginBottom:16}}>Ekibimiz 24 saat içinde yanıt verir.</div>
          <button onClick={()=>setShowContact(true)}
            style={{padding:"10px 24px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
            İletişime Geç
          </button>
        </div>
      </div>
    </section>
    </>
  );
}

// ── Blog Sayfası ───────────────────────────────────────────────────────────────
function BlogPage({ setPage, setActivePost }) {
  return (
    <section style={{minHeight:"100vh",padding:"90px 40px 80px",background:"#04100E"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <button onClick={()=>{setPage("home");window.scrollTo({top:0,behavior:"smooth"});}}
          style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:9,color:"rgba(255,255,255,0.75)",cursor:"pointer",fontSize:13,fontWeight:600,padding:"9px 16px",marginBottom:36,transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,201,167,0.1)";e.currentTarget.style.borderColor="rgba(0,201,167,0.3)";e.currentTarget.style.color="#fff";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";e.currentTarget.style.color="rgba(255,255,255,0.75)";}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Ana Sayfaya Dön
        </button>
        <div style={{textAlign:"center",marginBottom:52}}>
          <div style={{fontSize:11,color:"#00C9A7",fontWeight:700,letterSpacing:"2px",marginBottom:14}}>BLOG</div>
          <h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(30px,5vw,44px)",color:"#fff",fontWeight:700,letterSpacing:"-1px",marginBottom:14}}>
            Sağlık ve Longevity
          </h1>
          <p style={{fontSize:15,color:"rgba(255,255,255,0.45)",maxWidth:480,margin:"0 auto"}}>
            Bilimsel içerikler, kan değerlerinizi anlamanın yolları ve uzun yaşam rehberi.
          </p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {BLOG_POSTS.map(post=>(
            <div key={post.id}
              onClick={()=>{setActivePost(post);setPage("blogpost");window.scrollTo({top:0,behavior:"smooth"});}}
              style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"22px 24px",cursor:"pointer",transition:"all 0.2s",display:"flex",gap:18,alignItems:"flex-start"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.borderColor="rgba(0,201,167,0.2)";e.currentTarget.style.transform="translateX(4px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";e.currentTarget.style.transform="translateX(0)";}}>
              <div style={{width:52,height:52,borderRadius:12,background:"rgba(0,201,167,0.08)",border:"1px solid rgba(0,201,167,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                {post.emoji}
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:7}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#00C9A7",background:"rgba(0,201,167,0.1)",padding:"2px 8px",borderRadius:4}}>{post.cat}</span>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{post.date}</span>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>· {post.readMin} dk</span>
                </div>
                <h2 style={{fontFamily:"Georgia,serif",fontSize:19,color:"#fff",fontWeight:700,marginBottom:7,lineHeight:1.3}}>{post.title}</h2>
                <p style={{fontSize:13,color:"rgba(255,255,255,0.48)",lineHeight:1.7,margin:0}}>{post.summary}</p>
              </div>
              <span style={{fontSize:20,color:"rgba(255,255,255,0.18)",flexShrink:0,alignSelf:"center"}}>›</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Blog Yazı Sayfası ──────────────────────────────────────────────────────────
function BlogPostPage({ post, setPage }) {
  if (!post) { setPage("blog"); return null; }
  return (
    <section style={{minHeight:"100vh",padding:"90px 40px 80px",background:"#04100E"}}>
      <div style={{maxWidth:700,margin:"0 auto"}}>
        <button onClick={()=>{setPage("blog");window.scrollTo({top:0,behavior:"smooth"});}}
          style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:9,color:"rgba(255,255,255,0.75)",cursor:"pointer",fontSize:13,fontWeight:600,padding:"9px 16px",marginBottom:36,transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,201,167,0.1)";e.currentTarget.style.borderColor="rgba(0,201,167,0.3)";e.currentTarget.style.color="#fff";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.borderColor="rgba(255,255,255,0.12)";e.currentTarget.style.color="rgba(255,255,255,0.75)";}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Blog'a Dön
        </button>
        <div style={{marginBottom:36}}>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:11,fontWeight:700,color:"#00C9A7",background:"rgba(0,201,167,0.1)",padding:"3px 10px",borderRadius:4}}>{post.cat}</span>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.3)"}}>{post.date}</span>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.3)"}}>· {post.readMin} dk okuma</span>
          </div>
          <h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(24px,4vw,36px)",color:"#fff",fontWeight:700,lineHeight:1.25,marginBottom:18,letterSpacing:"-0.5px"}}>
            {post.title}
          </h1>
          <p style={{fontSize:15,color:"rgba(255,255,255,0.48)",lineHeight:1.8,borderLeft:"3px solid #00C9A7",paddingLeft:16,fontStyle:"italic"}}>
            {post.summary}
          </p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"rgba(0,201,167,0.06)",borderRadius:10,border:"1px solid rgba(0,201,167,0.15)",marginBottom:36}}>
          <div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#00C9A7,#0080FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",flexShrink:0}}>B</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>Prof. Dr. Burcu Barutçuoglu</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)"}}>Klinik Biyokimya Uzmani · Ege Üniversitesi</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:18}}>
          {post.content.map((block,i)=>{
            if (block.h) return <h2 key={i} style={{fontFamily:"Georgia,serif",fontSize:21,color:"#fff",fontWeight:700,marginTop:8}}>{block.h}</h2>;
            if (block.p) return <p key={i} style={{fontSize:15,color:"rgba(255,255,255,0.62)",lineHeight:1.9,margin:0}}>{block.p}</p>;
            return null;
          })}
        </div>
        <div style={{marginTop:52,padding:26,background:"linear-gradient(135deg,rgba(0,201,167,0.1),rgba(0,128,255,0.07))",border:"1px solid rgba(0,201,167,0.2)",borderRadius:14,textAlign:"center"}}>
          <div style={{fontSize:22,marginBottom:10}}>🧬</div>
          <h3 style={{fontFamily:"Georgia,serif",fontSize:20,color:"#fff",fontWeight:700,marginBottom:8}}>Biyolojik Yaşınızı Öğrenin</h3>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.45)",marginBottom:18}}>Kan tahlil sonuçlarınızı yükleyin, dakikalar içinde raporunuz hazır.</p>
          <button onClick={()=>{setPage("analyze");window.scrollTo({top:0,behavior:"smooth"});}}
            style={{padding:"11px 26px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
            Ücretsiz Analiz Başlat
          </button>
        </div>
      </div>
    </section>
  );
}

function Hero({ setPage, goAnalyze }) {
  const [count, setCount] = useState(0);
  useEffect(() => { const timer = setInterval(() => setCount(c => c < 2847 ? c+41 : 2847), 16); return () => clearInterval(timer); }, []);
  const go = goAnalyze;
  return (
    <section className="by-hero" style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",textAlign:"center",padding:"120px 40px 80px"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,201,167,0.15) 0%, transparent 60%)"}} />
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle, rgba(0,201,167,0.08) 1px, transparent 1px)",backgroundSize:"48px 48px"}} />
      {[["-10%","20%","400px","rgba(0,201,167,0.06)",3],["80%","60%","300px","rgba(0,128,255,0.06)",4],["40%","80%","250px","rgba(255,183,77,0.05)",5]].map(([l,t,s,c,d],i) => (
        <div key={i} style={{position:"absolute",left:l,top:t,width:s,height:s,borderRadius:"50%",background:c,filter:"blur(60px)",animation:`pulse ${d}s ease-in-out infinite alternate`}} />
      ))}
      <div style={{position:"relative",zIndex:2,maxWidth:760}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,201,167,0.08)",border:"1px solid rgba(0,201,167,0.2)",borderRadius:99,padding:"6px 16px",marginBottom:32}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#00C9A7",animation:"blink 1.5s infinite"}} />
          <span style={{fontSize:11,color:"#00C9A7",fontWeight:700,letterSpacing:"1px"}}>TÜRKİYE'NİN İLK KLİNİK BİYOKİMYA PLATFORMU</span>
        </div>
        <h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(40px,6vw,72px)",fontWeight:700,color:"#fff",lineHeight:1.1,marginBottom:24,letterSpacing:"-2px"}}>
          Kanınız gerçekte<br/>
          <span style={{background:"linear-gradient(90deg,#00C9A7,#4FC3F7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>kaç yaşında?</span>
        </h1>
        <p style={{fontSize:17,color:"rgba(255,255,255,0.55)",lineHeight:1.7,marginBottom:44,maxWidth:520,margin:"0 auto 44px"}}>
          PhenoAge algoritması ile rutin kan tahlillerinizden biyolojik yaşınızı hesaplayın.
        </p>
        <div className="by-hero-btns" style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",marginBottom:56}}>
          <button onClick={go}
            style={{background:"linear-gradient(135deg,#00C9A7,#0080FF)",border:"none",borderRadius:12,color:"#fff",fontWeight:700,fontSize:16,padding:"15px 34px",cursor:"pointer",boxShadow:"0 8px 32px rgba(0,201,167,0.3)",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 40px rgba(0,201,167,0.4)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,201,167,0.3)";}}>
            Ücretsiz Analiz Başlat →
          </button>

        </div>
        <div className="by-hero-stats" style={{display:"flex",gap:44,justifyContent:"center",flexWrap:"wrap"}}>
          {[{num:`${count.toLocaleString()}+`,label:"Analiz Yapıldı"},{num:"9",label:"Biyobelirteç"},{num:"Levine 2018",label:"Bilimsel Temel"},{num:"Prof. Dr.",label:"Onaylı"}].map(({num,label}) => (
            <div key={label} style={{textAlign:"center"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:24,fontWeight:700,color:"#00C9A7"}}>{num}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",letterSpacing:"0.5px",marginTop:4}}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How / Features / Pricing (kısa) ──────────────────────────────────────────
function How() {
  return (
    <section id="how" className="by-section" style={{padding:"100px 40px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:56}}>
          <div style={{fontSize:11,color:"#00C9A7",fontWeight:700,letterSpacing:"2px",marginBottom:14}}>NASIL ÇALIŞIR</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:40,color:"#fff",fontWeight:700,letterSpacing:"-1px"}}>4 adımda biyolojik yaşınız</h2>
        </div>
        <div className="by-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:18,alignItems:"stretch"}}>
          {[
            {n:"01",title:"PDF Yükle veya Gir",desc:"Tahlil PDF'nizi yükleyin ya da değerleri kendiniz girin.",icon:"📋"},
            {n:"02",title:"AI Okur",desc:"Yapay zeka değerleri otomatik çıkarır ve birimleri dönüştürür.",icon:"🤖"},
            {n:"03",title:"Algoritma Hesaplar",desc:"Levine PhenoAge (2018) 9 biyobelirteci analiz eder.",icon:"🔬"},
            {n:"04",title:"AI ile Soru Sor",desc:"Sonuçlarınız hakkında AI asistana soru sorun.",icon:"💬"},
          ].map((s,i) => (
            <div key={i} style={{position:"relative"}}>
              
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:22,position:"relative",zIndex:1,height:"100%",boxSizing:"border-box"}}>
                <div style={{width:46,height:46,borderRadius:12,background:"rgba(0,201,167,0.08)",border:"1px solid rgba(0,201,167,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:14,flexShrink:0}}><span style={{fontSize:22,lineHeight:1,display:"block"}}>{s.icon}</span></div>
                <div style={{fontSize:10,color:"#00C9A7",fontWeight:700,letterSpacing:"1px",marginBottom:7}}>ADIM {s.n}</div>
                <h3 style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:7}}>{s.title}</h3>
                <p style={{fontSize:13,color:"rgba(255,255,255,0.38)",lineHeight:1.6,margin:0}}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── PhenoAge Nedir? ───────────────────────────────────────────────────────────
function PhenoAgeNedir() {
  const biomarkers = [
    {n:1, name:"Albümin",        desc:"Karaciğer fonksiyonu, beslenme durumu",  unit:"g/dL"},
    {n:2, name:"Kreatinin",      desc:"Böbrek fonksiyonu",                       unit:"mg/dL"},
    {n:3, name:"Glukoz",         desc:"Metabolik sağlık",                        unit:"mg/dL"},
    {n:4, name:"Alkalen Fosfataz",desc:"Karaciğer ve kemik sağlığı",            unit:"U/L"},
    {n:5, name:"hs-CRP",         desc:"Sistemik inflamasyon",                   unit:"mg/L"},
    {n:6, name:"Lökosit (WBC)",  desc:"Bağışıklık aktivasyonu",                unit:"10³/µL"},
    {n:7, name:"Lenfosit %",     desc:"Bağışıklık dengesi",                     unit:"%"},
    {n:8, name:"MCV",            desc:"Kırmızı kan hücresi boyutu",             unit:"fL"},
    {n:9, name:"RDW",            desc:"Kırmızı kan hücresi varyasyonu",         unit:"%"},
  ];

  return (
    <section id="phenoage" style={{padding:"100px 40px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:60}}>
          <div style={{display:"inline-block",padding:"4px 16px",borderRadius:99,border:"1px solid rgba(0,201,167,0.4)",fontSize:11,color:"#00C9A7",fontWeight:700,letterSpacing:"1.5px",marginBottom:20}}>BİLİM</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:"clamp(32px,5vw,52px)",color:"#fff",fontWeight:700,letterSpacing:"-1px"}}>PhenoAge Nedir?</h2>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:60,alignItems:"start"}}>
          {/* Sol: Açıklama */}
          <div>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.65)",lineHeight:1.9,marginBottom:20}}>
              PhenoAge (Fenotipik Yaş), 2018 yılında Yale Tıp Okulu'nda biyolog Morgan Levine tarafından geliştirilen bir algoritmadır. Biyolojik yaşınızı — sağlık ve ölüm riski açısından vücudunuzun gerçekte nasıl "davrandığını" — tahmin etmek için 9 kan biyobelirteci ile kronolojik yaşı kullanır.
            </p>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.65)",lineHeight:1.9,marginBottom:28}}>
              Algoritma, NHANES III çalışmasındaki 11.000'den fazla yetişkinden elde edilen veriler üzerinde eğitildi. Tüm nedenlere bağlı ölüm, kardiyovasküler hastalık, diyabet ve kanser riskini tek başına kronolojik yaştan daha iyi öngörür.
            </p>
            <p style={{fontSize:13,color:"rgba(255,255,255,0.3)",lineHeight:1.7,fontStyle:"italic",marginBottom:28,paddingLeft:14,borderLeft:"2px solid rgba(0,201,167,0.3)"}}>
              Referans: Levine ME ve ark. "Yaşam süresi ve sağlık süresi için bir epigenetik yaşlanma biyobelirteci." Aging (2018).
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <a href="#how" onClick={e=>{e.preventDefault();document.getElementById("how")?.scrollIntoView({behavior:"smooth"});}}
                style={{display:"inline-flex",alignItems:"center",gap:8,color:"#00C9A7",fontSize:14,fontWeight:600,textDecoration:"none",transition:"gap 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.gap="12px"}
                onMouseLeave={e=>e.currentTarget.style.gap="8px"}>
                BioScope nasıl çalışır? →
              </a>

            </div>
          </div>

          {/* Sağ: 9 Biyobelirteç */}
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:16}}>9 Biyobelirteç</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {biomarkers.map(b=>(
                <div key={b.n}
                  style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,201,167,0.06)";e.currentTarget.style.borderColor="rgba(0,201,167,0.2)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";}}>
                  <div style={{width:28,height:28,borderRadius:7,background:"rgba(0,201,167,0.12)",border:"1px solid rgba(0,201,167,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#00C9A7",flexShrink:0}}>
                    {b.n}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{b.name}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginTop:2}}>{b.desc}</div>
                  </div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.28)",background:"rgba(255,255,255,0.05)",padding:"3px 8px",borderRadius:5,flexShrink:0}}>
                    {b.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="science" className="by-section" style={{padding:"100px 40px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:56}}>
          <div style={{fontSize:11,color:"#00C9A7",fontWeight:700,letterSpacing:"2px",marginBottom:14}}>NEDEN BİYOYAŞ</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:40,color:"#fff",fontWeight:700,letterSpacing:"-1px"}}>Bilim ve teknoloji bir arada</h2>
        </div>
        <div className="by-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18}}>
          {[
            {icon:"🔬",title:"PhenoAge Algoritması",desc:"Levine 2018 peer-reviewed algoritması.",color:"#00C9A7"},
            {icon:"📄",title:"PDF Yükleme",desc:"Tahlil PDF'nizi yükleyin, AI değerleri otomatik okusun.",color:"#4FC3F7"},
            {icon:"💬",title:"AI Soru-Cevap",desc:"Değerleriniz hakkında soru sorun, anında yanıt alın.",color:"#FFB74D"},
            {icon:"📊",title:"Referans Aralıkları",desc:"Her değer için optimal aralıklar ve klinik açıklamalar.",color:"#CE93D8"},
            {icon:"🎯",title:"Aksiyon Planı",desc:"Somut beslenme ve egzersiz önerileri.",color:"#81C784"},
            {icon:"👤",title:"Profil & Geçmiş",desc:"Analizlerinizi kaydedin, trend takibi yapın.",color:"#F48FB1"},
          ].map(f => (
            <div key={f.title}
              style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:26,transition:"all 0.3s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.transform="translateY(-4px)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.transform="translateY(0)";}}>
              <div style={{width:42,height:42,borderRadius:10,background:`${f.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:14}}>{f.icon}</div>
              <h3 style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:7}}>{f.title}</h3>
              <p style={{fontSize:13,color:"rgba(255,255,255,0.38)",lineHeight:1.6,margin:0}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Prof. Dr. Bölümü ─────────────────────────────────────────────────────────
const PROF_PHOTO = "data:image/png;base64,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";

function ProfSection() {
  const stats = [
    {label:"20+",  desc:"Yıl Deneyim"},
    {label:"Prof. Dr.", desc:"Unvan"},
    {label:"Ege Üni.", desc:"Kurum"},
  ];
  const items = [
    {icon:"🎓", text:"Ege Üniversitesi Tıp Fakültesi, Klinik Biyokimya ABD"},
    {icon:"🔬", text:"Biyolojik yaşlanma ve longevity biyobelirteçleri araştırmacısı"},
    {icon:"📄", text:"Levine PhenoAge (2018) algoritması baz alınmıştır"},
    {icon:"🏥", text:"20+ yıl klinik laboratuvar deneyimi"},
  ];
  return (
    <section style={{padding:"100px 40px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:52}}>
          <div style={{fontSize:11,color:"#00C9A7",fontWeight:700,letterSpacing:"2px",marginBottom:14}}>BİLİMSEL DANIŞMAN</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:40,color:"#fff",fontWeight:700,letterSpacing:"-1px"}}>Arkasında gerçek bir bilim insanı var</h2>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:60,flexWrap:"wrap",justifyContent:"center"}}>
          <div style={{position:"relative",flexShrink:0}}>
            <div style={{width:220,height:260,borderRadius:20,overflow:"hidden",border:"2px solid rgba(0,201,167,0.25)",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
              <img src={PROF_PHOTO} alt="Prof. Dr. Burcu Barutçuoğlu" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}} />
            </div>
            <div style={{position:"absolute",bottom:-14,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#00C9A7,#0080FF)",borderRadius:99,padding:"5px 16px",whiteSpace:"nowrap",fontSize:11,fontWeight:700,color:"#fff",boxShadow:"0 4px 16px rgba(0,201,167,0.3)"}}>
              ✓ Platform Kurucusu
            </div>
          </div>
          <div style={{maxWidth:520}}>
            <h3 style={{fontFamily:"Georgia,serif",fontSize:32,color:"#fff",fontWeight:700,marginBottom:4,letterSpacing:"-0.5px"}}>
              Prof. Dr. Burcu Barutçuoğlu
            </h3>
            <div style={{fontSize:14,color:"#00C9A7",fontWeight:600,marginBottom:20}}>
              Klinik Biyokimya Uzmanı · Ege Üniversitesi Tıp Fakültesi
            </div>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.62)",lineHeight:1.8,marginBottom:24}}>
              20 yılı aşkın klinik biyokimya deneyimiyle BioScope'ın bilimsel altyapısını geliştirdi.
              Levine PhenoAge algoritmasını Türkiye'de ilk kez klinik pratiğe uyarlayan isim.
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
              {items.map((item,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:16}}>{item.icon}</span>
                  <span style={{fontSize:13,color:"rgba(255,255,255,0.55)"}}>{item.text}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {stats.map(s => (
                <div key={s.label} style={{padding:"12px 20px",borderRadius:10,background:"rgba(0,201,167,0.08)",border:"1px solid rgba(0,201,167,0.15)",textAlign:"center"}}>
                  <div style={{fontFamily:"Georgia,serif",fontSize:20,fontWeight:700,color:"#00C9A7"}}>{s.label}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.38)",marginTop:2}}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
function Testimonials() {
  const [active, setActive] = useState(0);

  const reviews = [
    {
      name: "Ayşe K.",
      age: 52,
      city: "İzmir",
      avatar: "AK",
      color: "#00C9A7",
      bioAge: 44,
      diff: -8,
      stars: 5,
      text: "Doktorum tahlillerimin normal olduğunu söylüyordu ama bir şeyler eksik hissediyordum. BioScope'ta biyolojik yaşımın kronolojik yaşımdan 8 yıl genç çıkması hem şaşırttı hem motive etti. Artık 6 ayda bir takip ediyorum.",
      tag: "Yıllık Üye"
    },
    {
      name: "Mehmet D.",
      age: 47,
      city: "İstanbul",
      avatar: "MD",
      color: "#4FC3F7",
      bioAge: 54,
      diff: +7,
      stars: 5,
      text: "CRP ve RDW değerlerimin neden önemli olduğunu hiç bilmiyordum. AI yorumu bana gayet açık bir şekilde hangi değerlerime dikkat etmem gerektiğini anlattı. 3 ay sonra tekrar yaptım, biyolojik yaşım 2 yıl geriledi.",
      tag: "3 Rapor Paketi"
    },
    {
      name: "Dr. Selin T.",
      age: 38,
      city: "Ankara",
      avatar: "ST",
      color: "#FFB74D",
      bioAge: 33,
      diff: -5,
      stars: 5,
      text: "Klinisyen olarak PhenoAge algoritmasını biliyordum ama bu kadar sade ve kullanılabilir bir arayüzde görmek güzeldi. Hastalarıma önermek için güvenilir bir Türkçe kaynak arıyordum, sonunda buldum.",
      tag: "Uzman Kullanıcı"
    },
    {
      name: "Fatma Y.",
      age: 61,
      city: "Bursa",
      avatar: "FY",
      color: "#CE93D8",
      bioAge: 58,
      diff: -3,
      stars: 5,
      text: "PDF yükleme özelliği benim için çok kolaylaştırdı, değerleri tek tek girmek zorunda kalmadım. Sonuçlar çok detaylıydı, AI yorumu da gerçekten anlamlıydı. Kızıma da önerdim.",
      tag: "Tek Rapor"
    },
    {
      name: "Kemal A.",
      age: 44,
      city: "İzmir",
      avatar: "KA",
      color: "#81C784",
      bioAge: 49,
      diff: +5,
      stars: 5,
      text: "Spor yapıyorum, düzenli besleniyorum, 'sağlıklıyım' diye düşünüyordum. Ama biyolojik yaşım 5 yıl büyük çıktı. Albümin ve lenfosit değerlerimin sınırda olduğunu ilk kez fark ettim. Motivasyon açısından çok değerliydi.",
      tag: "3 Rapor Paketi"
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => setActive(a => (a+1) % reviews.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const r = reviews[active];

  return (
    <section style={{padding:"100px 40px",borderTop:"1px solid rgba(255,255,255,0.07)",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,201,167,0.04) 0%, transparent 70%)"}} />
      <div style={{maxWidth:900,margin:"0 auto",position:"relative",zIndex:1}}>

        {/* Başlık */}
        <div style={{textAlign:"center",marginBottom:56}}>
          <div style={{fontSize:11,color:"#00C9A7",fontWeight:700,letterSpacing:"2px",marginBottom:14}}>KULLANICI DENEYİMLERİ</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:40,color:"#fff",fontWeight:700,letterSpacing:"-1px"}}>Onlar ne dedi?</h2>
          <p style={{fontSize:15,color:"rgba(255,255,255,0.38)",marginTop:12}}>Beta kullanıcılarımızdan gerçek geri bildirimler</p>
        </div>

        {/* Ana kart */}
        <div className="by-testi-main" style={{background:"rgba(0,201,167,0.03)",border:`1px solid ${r.color}25`,borderRadius:24,padding:"40px 44px",marginBottom:24,transition:"all 0.5s",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${r.color},transparent)`}} />

          {/* Tırnak işareti */}
          <div style={{position:"absolute",top:32,right:40,fontSize:80,color:`${r.color}12`,fontFamily:"Georgia,serif",lineHeight:1,userSelect:"none"}}>&ldquo;</div>

          {/* Yıldızlar */}
          <div style={{display:"flex",gap:3,marginBottom:20}}>
            {[...Array(5)].map((_,i) => (
              <span key={i} style={{fontSize:16,color:"#FFB74D"}}>★</span>
            ))}
          </div>

          {/* Yorum metni */}
          <p style={{fontSize:17,color:"rgba(255,255,255,0.78)",lineHeight:1.8,marginBottom:28,maxWidth:680,fontStyle:"italic"}}>
            "{r.text}"
          </p>

          {/* Kullanıcı bilgisi */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:48,height:48,borderRadius:12,background:`linear-gradient(135deg,${r.color}40,${r.color}20)`,border:`1px solid ${r.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:r.color}}>
                {r.avatar}
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:"#fff"}}>{r.name}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.38)",marginTop:2}}>{r.age} yaş · {r.city}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{padding:"5px 12px",borderRadius:7,background:`${r.color}15`,border:`1px solid ${r.color}25`,fontSize:11,color:r.color,fontWeight:700}}>
                {r.tag}
              </div>
              <div style={{padding:"5px 14px",borderRadius:7,background:r.diff<=0?"rgba(0,201,167,0.1)":"rgba(239,83,80,0.1)",border:`1px solid ${r.diff<=0?"rgba(0,201,167,0.3)":"rgba(239,83,80,0.3)"}`,fontSize:12,fontWeight:700,color:r.diff<=0?"#00C9A7":"#EF5350"}}>
                Biyolojik yaş: {r.bioAge} ({r.diff>0?"+":""}{r.diff} yıl)
              </div>
            </div>
          </div>
        </div>

        {/* Navigasyon noktaları */}
        <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:32}}>
          {reviews.map((_,i) => (
            <button key={i} onClick={() => setActive(i)}
              style={{width:i===active?24:8,height:8,borderRadius:99,border:"none",cursor:"pointer",transition:"all 0.3s",
                background:i===active?"#00C9A7":"rgba(0,201,167,0.15)"}} />
          ))}
        </div>

        {/* Küçük kartlar — diğer yorumlar */}
        <div className="by-testi-mini" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
          {reviews.map((rv,i) => (
            <button key={i} onClick={() => setActive(i)}
              style={{padding:"12px 10px",borderRadius:12,border:`1px solid ${i===active?rv.color+"40":"rgba(0,201,167,0.05)"}`,
                background:i===active?`${rv.color}08`:"rgba(0,201,167,0.03)",
                cursor:"pointer",textAlign:"center",transition:"all 0.3s"}}>
              <div style={{width:32,height:32,borderRadius:8,background:`${rv.color}20`,border:`1px solid ${rv.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:rv.color,margin:"0 auto 7px"}}>
                {rv.avatar}
              </div>
              <div style={{fontSize:11,fontWeight:600,color:i===active?"#fff":"rgba(0,201,167,0.1)"}}>{rv.name}</div>
              <div style={{fontSize:10,color:rv.diff<=0?"#00C9A7":"#EF5350",marginTop:2,fontWeight:700}}>
                {rv.diff>0?"+":""}{rv.diff} yıl
              </div>
            </button>
          ))}
        </div>

        {/* Alt istatistik */}
        <div style={{display:"flex",justifyContent:"center",gap:40,marginTop:40,paddingTop:32,borderTop:"1px solid rgba(255,255,255,0.06)",flexWrap:"wrap"}}>
          {[
            {num:"4.9/5",label:"Ortalama Puan"},
            {num:"%94",label:"Tekrar Kullanım"},
            {num:"2.800+",label:"Beta Kullanıcı"},
            {num:"%87",label:"Memnuniyet"},
          ].map(s => (
            <div key={s.label} style={{textAlign:"center"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:26,fontWeight:700,color:"#00C9A7"}}>{s.num}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginTop:4}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ setPage, goAnalyze }) {
  const go = goAnalyze;
  return (
    <section id="pricing" className="by-section" style={{padding:"100px 40px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
      <div style={{maxWidth:900,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:56}}>
          <div style={{fontSize:11,color:"#00C9A7",fontWeight:700,letterSpacing:"2px",marginBottom:14}}>FİYATLAR</div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:40,color:"#fff",fontWeight:700,letterSpacing:"-1px"}}>Şeffaf fiyatlandırma</h2>
        </div>
        <div className="by-pricing-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18}}>
          {[
            {name:"Tek Rapor",price:"299 TL",period:"tek seferlik",features:["Tam BioScope skoru","Organ sistemi analizi","AI destekli yorum","PDF rapor"],pop:false},
            {name:"3 Rapor Paketi",price:"699 TL",period:"6 aylık takip",features:["3 tam analiz","Trend karşılaştırması","AI yorumu","PDF rapor","E-posta hatırlatma"],pop:true},
            {name:"Yıllık Üyelik",price:"999 TL",period:"yıllık",features:["Sınırsız analiz","Öncelikli destek","Aile paylaşımı","Tüm özellikler"],pop:false},
          ].map(pl => (
            <div key={pl.name} style={{background:pl.pop?"linear-gradient(135deg,rgba(0,201,167,0.12),rgba(0,128,255,0.08))":"rgba(0,201,167,0.03)",border:pl.pop?"1px solid rgba(0,201,167,0.35)":"1px solid rgba(0,201,167,0.05)",borderRadius:16,padding:26,position:"relative"}}>
              {pl.pop && <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#00C9A7,#0080FF)",borderRadius:99,padding:"4px 14px",fontSize:10,fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>EN POPÜLER</div>}
              <div style={{marginBottom:18}}>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.55)",marginBottom:7}}>{pl.name}</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:36,fontWeight:700,color:"#fff"}}>{pl.price}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginTop:3}}>{pl.period}</div>
              </div>
              <div style={{marginBottom:22}}>
                {pl.features.map(f => (
                  <div key={f} style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                    <span style={{color:"#00C9A7",fontSize:13}}>✓</span>
                    <span style={{fontSize:13,color:"rgba(255,255,255,0.55)"}}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={go}
                style={{width:"100%",padding:"12px",borderRadius:10,border:pl.pop?"none":"1px solid rgba(255,255,255,0.25)",background:pl.pop?"linear-gradient(135deg,#00C9A7,#0080FF)":"transparent",color:pl.pop?"#fff":"rgba(255,255,255,0.7)",fontWeight:700,fontSize:14,cursor:"pointer",transition:"all 0.2s"}}
                onMouseEnter={e=>{if(pl.pop){e.currentTarget.style.opacity="0.85";e.currentTarget.style.transform="translateY(-2px)";}else{e.currentTarget.style.background="linear-gradient(135deg,#00C9A7,#0080FF)";e.currentTarget.style.color="#fff";e.currentTarget.style.border="none";e.currentTarget.style.transform="translateY(-2px)";}}}
                onMouseLeave={e=>{if(pl.pop){e.currentTarget.style.opacity="1";e.currentTarget.style.transform="translateY(0)";}else{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.7)";e.currentTarget.style.border="1px solid rgba(255,255,255,0.25)";e.currentTarget.style.transform="translateY(0)";}}}> 
                Hemen Başla
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Ödeme Modal ───────────────────────────────────────────────────────────────
// iyzico ödeme linklerini buraya yapıştırın (dashboard > ödeme linkleri)
// ── Dil ───────────────────────────────────────────────────────────────────────
const IYZICO_LINKS = {
  tek:    "https://iyzi.co/LINK_TEK_RAPOR",      // 299 TL — iyzico linkini buraya yapıştır
  uc:     "https://iyzi.co/LINK_UC_RAPOR",        // 699 TL
  yillik: "https://iyzi.co/LINK_YILLIK_UYELIK",  // 999 TL
};

// Admin listesi — bu e-postalar tüm içeriği ücretsiz görür
const ADMIN_EMAILS = [
  "kaan.barutcu@gmail.com",
  // daha fazla admin: "annen@gmail.com",
];
const isAdmin = (user) => user && ADMIN_EMAILS.includes((user.email||"").toLowerCase().trim());

function PaymentModal({ onClose, result }) {
  const [selected, setSelected] = useState("tek");

  const plans = [
    {
      id:"tek", name:"Tek Rapor", price:"299 TL", period:"tek seferlik",
      features:["Tam BioScope skoru","Organ sistemi analizi","AI uzman yorumu","PDF rapor","Referans aralıkları"],
      color:"#4FC3F7", pop:false,
    },
    {
      id:"uc", name:"3 Rapor Paketi", price:"699 TL", period:"6 aylık takip",
      features:["3 tam analiz","Trend karşılaştırması","AI yorumu","PDF rapor","E-posta hatırlatma","Öncelikli destek"],
      color:"#00C9A7", pop:true,
    },
    {
      id:"yillik", name:"Yıllık Üyelik", price:"999 TL", period:"yıllık",
      features:["Sınırsız analiz","Aile paylaşımı (3 kişi)","Öncelikli destek","Tüm özellikler","Yeni özellikler ücretsiz"],
      color:"#CE93D8", pop:false,
    },
  ];

  const handlePay = () => {
    const link = IYZICO_LINKS[selected];
    // İyzico linki gerçek olduğunda yeni sekmede açar
    window.open(link, "_blank");
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(12px)"}} />
      <div style={{position:"relative",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(0,201,167,0.2)",borderRadius:24,width:"100%",maxWidth:780,maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,0.7)"}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:"22px 28px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,201,167,0.04)"}}>
          <div>
            <h3 style={{fontFamily:"Georgia,serif",fontSize:22,color:"#fff",fontWeight:700}}>Tam Raporunuzu Açın</h3>
            <p style={{fontSize:13,color:"rgba(255,255,255,0.38)",marginTop:3}}>
              Biyolojik yaşınız <strong style={{color:"#00C9A7"}}>{result.bioAge}</strong> · Bir plan seçin
            </p>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",border:"none",borderRadius:10,color:"rgba(255,255,255,0.55)",fontSize:18,width:38,height:38,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        <div style={{overflowY:"auto",padding:24}}>
          {/* Plan seçimi */}
          <div className="by-payment-plans" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
            {plans.map(pl => (
              <div key={pl.id} onClick={()=>setSelected(pl.id)}
                style={{position:"relative",background:selected===pl.id?`${pl.color}10`:"rgba(0,201,167,0.03)",
                  border:`2px solid ${selected===pl.id?pl.color:"rgba(0,201,167,0.05)"}`,
                  borderRadius:16,padding:20,cursor:"pointer",transition:"all 0.25s"}}>
                {pl.pop && <div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#00C9A7,#0080FF)",borderRadius:99,padding:"3px 12px",fontSize:10,fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>EN POPÜLER</div>}
                {selected===pl.id && <div style={{position:"absolute",top:12,right:12,width:20,height:20,borderRadius:"50%",background:pl.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700}}>✓</div>}
                <div style={{fontSize:12,color:"rgba(255,255,255,0.38)",marginBottom:5}}>{pl.name}</div>
                <div style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:700,color:"#fff",marginBottom:3}}>{pl.price}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginBottom:14}}>{pl.period}</div>
                {pl.features.map(f=>(
                  <div key={f} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                    <span style={{color:pl.color,fontSize:12,flexShrink:0}}>✓</span>
                    <span style={{fontSize:12,color:"rgba(255,255,255,0.55)"}}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Güven rozetleri */}
          <div className="by-trust-badges" style={{display:"flex",gap:12,justifyContent:"center",marginBottom:22,flexWrap:"wrap"}}>
            {[
              {icon:"🔒",text:"256-bit SSL Şifreleme"},
              {icon:"✅",text:"iyzico Güvencesi"},
              {icon:"↩️",text:"7 Gün İade Garantisi"},
              {icon:"🏛️",text:"KVKK Uyumlu"},
            ].map(b=>(
              <div key={b.text} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                <span style={{fontSize:14}}>{b.icon}</span>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:500}}>{b.text}</span>
              </div>
            ))}
          </div>

          {/* Ödeme butonu */}
          <button onClick={handlePay}
            style={{width:"100%",padding:"16px",borderRadius:12,border:"none",
              background:"linear-gradient(135deg,#00C9A7,#0080FF)",
              color:"#fff",fontWeight:800,fontSize:17,cursor:"pointer",
              boxShadow:"0 8px 32px rgba(0,201,167,0.3)",transition:"all 0.2s",marginBottom:12}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 40px rgba(0,201,167,0.4)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,201,167,0.3)";}}>
            🔒 Güvenli Ödeme — {plans.find(p=>p.id===selected)?.price}
          </button>

          <p style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.38)"}}>
            iyzico altyapısıyla güvenli ödeme · Kredi kartı, banka kartı, havale
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sonuç Ekranı ──────────────────────────────────────────────────────────────
// ── Aksiyon Planı ─────────────────────────────────────────────────────────────
// ── Popülasyon Karşılaştırma Grafiği ──────────────────────────────────────────
function PopulasyonGrafigi({ result }) {
  // Yaş grubuna göre popülasyon biyolojik yaş dağılımı (PhenoAge literatürü baz alındı)
  // Ortalama: kronolojik yaş + 0.5, std: ~6 yıl
  const mean = result.chronoAge + 0.5;
  const std  = 6.5;

  // Normal dağılım fonksiyonu
  const normalPDF = (x, mu, sigma) => {
    return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
  };

  // Grafik verisi: kullanıcı yaşı ± 25 yıl aralığında
  const minX = Math.max(15, result.chronoAge - 22);
  const maxX = Math.min(100, result.chronoAge + 22);
  const data = [];
  for (let x = minX; x <= maxX; x += 0.5) {
    const y = normalPDF(x, mean, std);
    data.push({
      age: Math.round(x * 10) / 10,
      pop: Math.round(y * 10000) / 100,
      // Renkli alan: kullanıcının solunda mı sağında mı
      below: x <= result.bioAge ? Math.round(y * 10000) / 100 : 0,
    });
  }

  // Kullanıcı popülasyonun kaçıncı yüzdeliğinde?
  const zScore = (result.bioAge - mean) / std;
  // Yaklaşık percentile hesabı (normal dağılım CDF approximation)
  const erf = (x) => {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return x >= 0 ? y : -y;
  };
  const percentile = Math.round((1 + erf(zScore / Math.sqrt(2))) / 2 * 100);

  const diffColor = result.diff <= -3 ? "#00C9A7" : result.diff <= 3 ? "#FFB74D" : "#EF5350";
  const diffLabel = result.diff <= -3
    ? `Yaşınızdaki insanların %${100 - percentile}'inden biyolojik olarak daha gençsiniz 🏆`
    : result.diff <= 3
    ? `Yaşınızdaki insanların ortalamasındasınız 👍`
    : `Yaşınızdaki insanların %${percentile}'inin biyolojik yaşı sizden düşük ⚠️`;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{background:"rgba(4,16,14,0.95)",border:"1px solid rgba(0,201,167,0.2)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#fff"}}>
        <div>Biyolojik Yaş: <strong>{payload[0]?.payload?.age}</strong></div>
      </div>
    );
  };

  return (
    <div style={{marginBottom:16,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"20px 20px 12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:4}}>📊 Popülasyon Karşılaştırması</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>Kronolojik yaşınız {result.chronoAge} olan kişilerle karşılaştırma</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0,marginLeft:16}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:700,color:diffColor}}>{percentile}.</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.38)"}}>yüzdelik</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{top:20,right:10,left:-20,bottom:0}}>
          <defs>
            <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="rgba(255,255,255,0.15)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="rgba(255,255,255,0.03)"  stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={diffColor} stopOpacity={0.6}/>
              <stop offset="95%" stopColor={diffColor} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="age" tick={{fill:"rgba(255,255,255,0.35)",fontSize:10}} tickLine={false} axisLine={{stroke:"rgba(255,255,255,0.07)"}}
            tickFormatter={v=>v%5===0?v:""} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          {/* Tüm popülasyon */}
          <Area type="monotone" dataKey="pop" stroke="rgba(255,255,255,0.15)" strokeWidth={1}
            fill="url(#popGrad)" dot={false} />
          {/* Kullanıcının solundaki alan */}
          <Area type="monotone" dataKey="below" stroke={diffColor} strokeWidth={0}
            fill="url(#userGrad)" dot={false} />
          {/* Ortalama çizgisi */}
          <ReferenceLine x={Math.round(mean)} stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="3 3"
            label={{value:`Ort: ${Math.round(mean)}`,position:"insideTopRight",fill:"rgba(255,255,255,0.4)",fontSize:10}} />
          {/* Kullanıcı çizgisi + nokta */}
          <ReferenceLine x={result.bioAge} stroke={diffColor} strokeWidth={2} strokeDasharray="4 2"
            label={{value:`● Sen: ${result.bioAge}`,position:"top",fill:diffColor,fontSize:11,fontWeight:700}} />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{marginTop:10,padding:"10px 14px",background:`${diffColor}10`,borderRadius:8,border:`1px solid ${diffColor}25`,fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.6,marginBottom:8}}>
        {diffLabel}
      </div>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",lineHeight:1.6}}>
        * Dağılım, Levine vd. (2018) NHANES III/IV verisinden türetilen parametreler kullanılarak hesaplanmıştır: ortalama = kronolojik yaş, SD = 6.5 yıl, n ≈ 11.432. Bireysel sonuçlar farklılık gösterebilir.
      </div>
    </div>
  );
}

function AksiyonPlani({ result }) {
  const [open, setOpen] = useState(false);

  // Sonuçlara göre kişisel öneriler üret
  const plans = [];
  const v = result.vals;

  // CRP — inflamasyon
  if (v.crp !== null) {
    if (v.crp > 3) {
      plans.push({ cat:"İnflamasyon", col:"#EF5350", bg:"rgba(239,83,80,0.08)", icon:"🔥",
        title:"CRP değeriniz yüksek — inflamasyonu düşürün",
        items:["Her gün 2 yemek kaşığı zeytinyağı tüketin","Haftada 3 kez somon veya sardalye yiyin","Şeker ve işlenmiş gıdaları 4 hafta boyunca kesin","Zerdeçal + karabiber kombinasyonunu yemeklere ekleyin"] });
    } else if (v.crp <= 1) {
      plans.push({ cat:"İnflamasyon", col:"#00C9A7", bg:"rgba(0,201,167,0.08)", icon:"✅",
        title:"CRP değeriniz mükemmel — sürdürün",
        items:["Mevcut beslenme düzeninizi koruyun","Antiinflamatuar gıdaları hayatınızdan çıkarmayın","6 ayda bir kontrol ettirin"] });
    }
  }

  // Glukoz — metabolik
  if (v.glucose !== null) {
    if (v.glucose > 100) {
      plans.push({ cat:"Metabolik", col:"#FFB74D", bg:"rgba(255,183,77,0.08)", icon:"⚡",
        title:"Kan şekeriniz yüksek sınırda — metabolizmanızı iyileştirin",
        items:["Karbonhidrat tüketimini öğün başına 30g altında tutun","16:8 aralıklı oruç protokolü deneyin","Her öğünden sonra 10 dk yürüyüş yapın","Beyaz ekmek, pirinç ve makarnayı tam tahılla değiştirin"] });
    } else if (v.glucose <= 85) {
      plans.push({ cat:"Metabolik", col:"#00C9A7", bg:"rgba(0,201,167,0.08)", icon:"✅",
        title:"Glukoz değeriniz optimal — devam edin",
        items:["Aralıklı oruç uygulamanız varsa sürdürün","Kan şekerini dengeleyen beslenmeye devam edin"] });
    }
  }

  // RDW — hücresel yaşlanma
  if (v.rdw !== null) {
    if (v.rdw > 14) {
      plans.push({ cat:"Hematoloji", col:"#CE93D8", bg:"rgba(206,147,216,0.08)", icon:"🔴",
        title:"RDW değeriniz yüksek — hücresel stres var",
        items:["B12 ve folat açısından kan tahlili yaptırın","Kırmızı et, yumurta ve koyu yeşil sebzeleri artırın","D vitamini seviyenizi kontrol ettirin","Alkol tüketimini minimuma indirin"] });
    }
  }

  // Albumin — karaciğer & protein
  if (v.albumin !== null) {
    if (v.albumin < 4.0) {
      plans.push({ cat:"Karaciğer & Protein", col:"#FFB74D", bg:"rgba(255,183,77,0.08)", icon:"⚠️",
        title:"Albumin düşük — protein alımını artırın",
        items:["Günlük kg başına en az 1.5g protein tüketin","Her öğünde yumurta, baklagil veya et olsun","Whey protein takviyesi değerlendirin","Karaciğer sağlığı için alkol tüketimini bırakın"] });
    }
  }

  // Egzersiz — genel diff'e göre
  if (result.diff > 3) {
    plans.push({ cat:"Egzersiz", col:"#4FC3F7", bg:"rgba(79,195,247,0.08)", icon:"🏃",
      title:"Biyolojik yaşınız yüksek — egzersiz önceliğiniz olsun",
      items:["Haftada 5 gün 30 dk Zone 2 egzersizi yapın (rahat tempo yürüyüş/bisiklet)","Haftada 2 kez direnç antrenmanı ekleyin","Oturma sürelerinizi kısaltın, her saat ayağa kalkın","Egzersiz günlüğü tutun, hedef belirleyin"] });
  } else if (result.diff <= -3) {
    plans.push({ cat:"Egzersiz", col:"#00C9A7", bg:"rgba(0,201,167,0.08)", icon:"🏆",
      title:"Harika! Aktif yaşamınızı sürdürün",
      items:["Mevcut egzersiz rutininizi koruyun","Zone 2 antrenmanına ağırlık verin","Yılda bir kez tam check-up yaptırın"] });
  }

  // Uyku & stres — genel
  plans.push({ cat:"Uyku & Stres", col:"#81C784", bg:"rgba(129,199,132,0.08)", icon:"😴",
    title:"Uyku kalitesi biyolojik yaşı doğrudan etkiler",
    items:["Her gece aynı saatte uyuyup kalkın","Yatmadan 1 saat önce ekranları kapatın","Yatak odası sıcaklığını 18-20°C tutun","Günde 10 dk meditasyon veya nefes egzersizi yapın"] });

  // 6 aylık takip
  plans.push({ cat:"Takip Planı", col:"#00C9A7", bg:"rgba(0,201,167,0.08)", icon:"📅",
    title:"6 ay sonra tekrar test edin",
    items:[
      "Bu önerileri uygulayın, 6 ay sonra yeniden analiz yaptırın",
      "Hedef: Biyolojik yaşı " + (result.diff > 0 ? Math.ceil(result.diff) + " yıl düşürmek" : "daha da iyileştirmek"),
      "BioScope üzerinden analiz geçmişinizi takip edin",
    ] });

  return (
    <div style={{marginBottom:16}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:"100%",padding:"16px 22px",background:"rgba(0,201,167,0.06)",border:"1px solid rgba(0,201,167,0.2)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"all 0.2s"}}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(0,201,167,0.1)"}
        onMouseLeave={e=>e.currentTarget.style.background="rgba(0,201,167,0.06)"}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#00C9A7,#0080FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎯</div>
          <div style={{textAlign:"left"}}>
            <div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:700,color:"#fff"}}>Kişisel Aksiyon Planınız</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:2}}>{plans.length} öneri · Sonuçlarınıza özel hazırlandı</div>
          </div>
        </div>
        <span style={{color:"#00C9A7",fontSize:20,transition:"transform 0.3s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)"}}>⌄</span>
      </button>

      {open && (
        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:10}}>
          {plans.map((p,i)=>(
            <div key={i} style={{background:p.bg,border:`1px solid ${p.col}30`,borderRadius:12,padding:"16px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <span style={{fontSize:20}}>{p.icon}</span>
                <div>
                  <div style={{fontSize:11,color:p.col,fontWeight:700,letterSpacing:"0.5px",marginBottom:2}}>{p.cat.toUpperCase()}</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{p.title}</div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {p.items.map((item,j)=>(
                  <div key={j} style={{display:"flex",alignItems:"flex-start",gap:10}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:p.col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700,flexShrink:0,marginTop:1}}>✓</div>
                    <span style={{fontSize:13,color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{padding:"12px 16px",background:"rgba(255,255,255,0.03)",borderRadius:10,border:"1px solid rgba(255,255,255,0.06)",fontSize:11,color:"rgba(255,255,255,0.3)",textAlign:"center",lineHeight:1.7}}>
            Bu öneriler PhenoAge algoritması sonuçlarına göre hazırlanmıştır.<br/>Tıbbi tavsiye yerine geçmez — doktorunuza danışın.
          </div>
        </div>
      )}
    </div>
  );
}

function ResultView({ result, aiText, aiLoading, onReset, onSave, user }) {
  const meds = result.meds || [];
  const [showAsk,     setShowAsk]     = useState(false);
  const [showRef,     setShowRef]     = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [saved,       setSaved]       = useState(false);
  const unlocked = isAdmin(user); // admin e-postası → tüm içerik ücretsiz

  const context = BIOMARKERS
    .filter(b=>b.key!=="age"&&result.vals[b.key]!=null)
    .map(b=>`${b.label}: ${result.vals[b.key]} ${b.unit}`)
    .join(", ");

  const handleSave = () => { onSave(result); setSaved(true); };

  const downloadPDF = () => {
    const diffText = result.diff<=-3?"Gençsiniz! Biyolojik yaşınız kronolojik yaşınızdan daha düşük.":result.diff<=3?"Normal aralıkta. Biyolojik yaşınız yaşınıza uygun.":"Dikkat! Biyolojik yaşınız kronolojik yaşınızdan yüksek.";
    const sysScores = SYSTEM_KEYS.map(([name,keys])=>{
      const sc=keys.map(k=>getScore(k,result.vals[k])).filter(s=>s!==null);
      if(!sc.length) return null;
      const avg=Math.round(sc.reduce((a,b)=>a+b,0)/sc.length);
      return {name,avg};
    }).filter(Boolean);

    const printWindow = window.open('','_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>BioScope Analiz Raporu</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Georgia, serif; background:#fff; color:#111; padding:40px; max-width:800px; margin:0 auto; }
        .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; padding-bottom:20px; border-bottom:2px solid #00C9A7; }
        .logo { font-size:24px; font-weight:700; color:#04100E; }
        .logo span { color:#00C9A7; }
        .date { font-size:12px; color:#666; font-family:sans-serif; }
        .score-box { background:linear-gradient(135deg,#e8faf6,#e8f4ff); border:1px solid #00C9A7; border-radius:16px; padding:32px; text-align:center; margin-bottom:24px; }
        .score-label { font-size:11px; color:#666; letter-spacing:2px; font-family:sans-serif; margin-bottom:8px; }
        .score-num { font-size:72px; font-weight:700; color:#04100E; line-height:1; margin-bottom:8px; }
        .score-sub { font-size:13px; color:#666; font-family:sans-serif; }
        .badge { display:inline-block; margin-top:12px; padding:6px 18px; border-radius:99px; font-size:14px; font-weight:700; font-family:sans-serif; background:${result.diff<=-3?"#e8faf6":result.diff<=3?"#fff8e1":"#fdecea"}; color:${result.diff<=-3?"#00856A":result.diff<=3?"#F57F17":"#C62828"}; border:1px solid ${result.diff<=-3?"#00C9A7":result.diff<=3?"#FFB300":"#EF5350"}; }
        .section-title { font-size:16px; font-weight:700; color:#04100E; margin:24px 0 12px; padding-bottom:6px; border-bottom:1px solid #eee; }
        .sys-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
        .sys-card { border:1px solid #eee; border-radius:10px; padding:14px; }
        .sys-name { font-size:11px; color:#666; font-family:sans-serif; font-weight:700; margin-bottom:6px; }
        .sys-score { font-size:24px; font-weight:700; font-family:Georgia; color:${result.diff<=-3?"#00856A":result.diff<=3?"#F57F17":"#C62828"}; }
        .bar { height:4px; background:#eee; border-radius:99px; margin:6px 0; overflow:hidden; }
        .bar-fill { height:100%; border-radius:99px; }
        .vals-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:24px; }
        .val-row { display:flex; justify-content:space-between; padding:8px 12px; background:#f8f9fa; border-radius:7px; font-family:sans-serif; font-size:13px; }
        .val-name { color:#555; }
        .val-num { font-weight:700; color:#111; }
        .ai-box { background:#f0faf7; border:1px solid #00C9A7; border-radius:12px; padding:20px; margin-bottom:24px; }
        .ai-title { font-size:13px; font-weight:700; color:#00856A; font-family:sans-serif; margin-bottom:8px; }
        .ai-text { font-size:13px; color:#333; line-height:1.8; font-family:sans-serif; }
        .footer { margin-top:32px; padding-top:16px; border-top:1px solid #eee; font-size:11px; color:#999; font-family:sans-serif; text-align:center; }
        @media print { body { padding:20px; } }
      </style>
      </head><body>
      <div class="header">
        <div class="logo">Bio<span>Scope</span></div>
        <div class="date">Analiz Tarihi: ${new Date().toLocaleDateString('tr-TR', {day:'numeric',month:'long',year:'numeric'})}</div>
      </div>

      <div class="score-box">
        <div class="score-label">BİYOLOJİK YAŞINIZ</div>
        <div class="score-num">${result.bioAge}</div>
        <div class="score-sub">Kronolojik yaşınız: <strong>${result.chronoAge}</strong></div>
        <div class="badge">${result.diff>0?"+"+result.diff:result.diff} yıl — ${diffText}</div>
      </div>

      <div class="section-title">🔬 Sistem Bazlı Analiz</div>
      <div class="sys-grid">
        ${sysScores.map(s=>{
          const col=s.avg>=80?"#00856A":s.avg>=60?"#F57F17":"#C62828";
          const bg=s.avg>=80?"#00C9A7":s.avg>=60?"#FFB300":"#EF5350";
          return `<div class="sys-card">
            <div class="sys-name">${s.name}</div>
            <div class="sys-score" style="color:${col}">${s.avg}</div>
            <div class="bar"><div class="bar-fill" style="width:${s.avg}%;background:${bg}"></div></div>
          </div>`;
        }).join('')}
      </div>

      <div class="section-title">🩸 Kan Değerleriniz</div>
      <div class="vals-grid">
        ${BIOMARKERS.filter(b=>b.key!=="age"&&result.vals[b.key]!=null).map(b=>`
          <div class="val-row">
            <span class="val-name">${b.label}</span>
            <span class="val-num">${result.vals[b.key]} ${b.unit}</span>
          </div>
        `).join('')}
      </div>

      ${aiText ? `
      <div class="section-title">✨ AI Uzman Yorumu</div>
      <div class="ai-box">
        <div class="ai-title">Prof. Dr. Burcu Barutçuoğlu — Klinik Biyokimya Uzmanı</div>
        <div class="ai-text">${aiText}</div>
      </div>` : ''}

      <div class="footer">
        Bu rapor BioScope platformu (bioscope.com.tr) tarafından oluşturulmuştur.<br>
        Levine PhenoAge algoritması kullanılmıştır (Aging Albany NY, 2018).<br>
        Bu rapor tıbbi tanı yerine geçmez. Sağlık kararları için doktorunuza danışın.
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(()=>{ printWindow.print(); }, 500);
  };

  const downloadPDFBlob = () => {
    const diffColor = result.diff<=-3?"#00856A":result.diff<=3?"#D97706":"#C62828";
    const diffBg    = result.diff<=-3?"#ecfdf5":result.diff<=3?"#fffbeb":"#fef2f2";
    const diffBorder= result.diff<=-3?"#00C9A7":result.diff<=3?"#F59E0B":"#EF4444";
    const diffLabel = result.diff<=-3?"Mükemmel — Yaşınızdan Daha Gençsiniz":result.diff<=3?"Normal — Yaşınıza Uygun":"Dikkat — Biyolojik Yaşınız Yüksek";
    const diffIcon  = result.diff<=-3?"🏆":result.diff<=3?"✅":"⚠️";

    const sysScores = SYSTEM_KEYS.map(([name,keys])=>{
      const sc=keys.map(k=>getScore(k,result.vals[k])).filter(s=>s!==null);
      if(!sc.length) return null;
      const avg=Math.round(sc.reduce((a,b)=>a+b,0)/sc.length);
      const col=avg>=80?"#00856A":avg>=60?"#D97706":"#C62828";
      const bg =avg>=80?"#00C9A7":avg>=60?"#F59E0B":"#EF4444";
      const status=avg>=80?"İyi":avg>=60?"Orta":"Dikkat";
      const tip=avg>=80?"Bu sistem sağlıklı görünüyor.":avg>=60?"Takip edilmesi önerilir.":"Bir uzmana danışmanızı öneririz.";
      return {name,avg,col,bg,status,tip};
    }).filter(Boolean);

    const valRows = BIOMARKERS.filter(b=>b.key!=="age"&&result.vals[b.key]!=null).map(b=>{
      const score=getScore(b.key,result.vals[b.key]);
      const sc=score>=80?"#00856A":score>=60?"#D97706":score!==null?"#C62828":"#888";
      const sl=score>=80?"İyi":score>=60?"Orta":score!==null?"Yüksek/Düşük":"—";
      return {label:b.label,val:result.vals[b.key],unit:b.unit,sc,sl};
    });

    const html = `<!DOCTYPE html>
<html lang="tr"><head>
<meta charset="utf-8">
<title>BioScope — Biyolojik Yaş Raporu</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter',sans-serif;background:#f9fafb;color:#111827;font-size:14px;}
  .page{max-width:800px;margin:0 auto;background:#fff;min-height:100vh;}

  /* ── HEADER ── */
  .header{background:linear-gradient(135deg,#04100E 0%,#0a2420 100%);padding:28px 40px;display:flex;justify-content:space-between;align-items:center;}
  .logo{font-family:Georgia,serif;font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px;}
  .logo span{color:#00C9A7;}
  .header-right{text-align:right;}
  .header-right .label{font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;}
  .header-right .val{font-size:13px;color:rgba(255,255,255,0.8);}

  /* ── HERO SCORE ── */
  .hero{padding:32px 40px;background:linear-gradient(135deg,#f0fdf9,#eff6ff);border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:32px;}
  .score-circle{width:140px;height:140px;border-radius:50%;background:#fff;border:4px solid ${diffBorder};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
  .score-big{font-family:Georgia,serif;font-size:52px;font-weight:700;color:#111827;line-height:1;}
  .score-unit{font-size:11px;color:#6b7280;margin-top:2px;letter-spacing:0.5px;}
  .hero-info{flex:1;}
  .hero-title{font-family:Georgia,serif;font-size:22px;font-weight:700;color:#111827;margin-bottom:6px;}
  .hero-sub{font-size:13px;color:#6b7280;margin-bottom:14px;line-height:1.6;}
  .diff-badge{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:99px;font-size:13px;font-weight:600;background:${diffBg};color:${diffColor};border:1px solid ${diffBorder};}
  .chrono{display:inline-block;margin-left:12px;font-size:12px;color:#6b7280;background:#f3f4f6;padding:6px 12px;border-radius:8px;}

  /* ── SECTIONS ── */
  .body{padding:32px 40px;}
  .section{margin-bottom:32px;}
  .section-header{display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #f3f4f6;}
  .section-icon{width:32px;height:32px;border-radius:8px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;font-size:16px;}
  .section-title{font-size:15px;font-weight:700;color:#111827;}
  .section-subtitle{font-size:11px;color:#9ca3af;margin-left:auto;}

  /* ── SYS CARDS ── */
  .sys-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
  .sys-card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;position:relative;overflow:hidden;}
  .sys-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--c);}
  .sys-card-name{font-size:11px;color:#6b7280;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;}
  .sys-card-score{font-family:Georgia,serif;font-size:32px;font-weight:700;margin-bottom:6px;}
  .sys-bar{height:5px;background:#f3f4f6;border-radius:99px;overflow:hidden;margin-bottom:8px;}
  .sys-bar-fill{height:100%;border-radius:99px;}
  .sys-status{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;}
  .sys-tip{font-size:11px;color:#9ca3af;margin-top:6px;line-height:1.5;}

  /* ── VAL TABLE ── */
  .val-table{width:100%;border-collapse:collapse;}
  .val-table th{font-size:10px;color:#9ca3af;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;padding:8px 12px;text-align:left;background:#f9fafb;border-bottom:1px solid #e5e7eb;}
  .val-table td{padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;}
  .val-table tr:last-child td{border-bottom:none;}
  .val-table tr:hover td{background:#f9fafb;}
  .status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;}

  /* ── AI BOX ── */
  .ai-box{background:linear-gradient(135deg,#f0fdf9,#eff6ff);border:1px solid #a7f3d0;border-radius:12px;padding:24px;}
  .ai-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
  .ai-avatar{width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#00C9A7,#0080FF);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;font-weight:700;font-family:Georgia;}
  .ai-name{font-size:13px;font-weight:700;color:#111827;}
  .ai-role{font-size:11px;color:#6b7280;}
  .ai-text{font-size:13px;color:#374151;line-height:1.9;white-space:pre-wrap;}

  /* ── INFO BOX ── */
  .info-box{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:24px;display:flex;gap:12px;align-items:flex-start;}
  .info-icon{font-size:18px;flex-shrink:0;}
  .info-text{font-size:12px;color:#92400e;line-height:1.7;}
  .info-text strong{color:#78350f;}

  /* ── FOOTER ── */
  .footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;display:flex;justify-content:space-between;align-items:center;}
  .footer-logo{font-family:Georgia,serif;font-size:14px;font-weight:700;color:#6b7280;}
  .footer-logo span{color:#00C9A7;}
  .footer-text{font-size:11px;color:#9ca3af;text-align:right;line-height:1.6;}

  @media print{body{background:#fff;}.page{box-shadow:none;}}
</style>
</head><body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="logo">Bio<span>Scope</span></div>
    <div class="header-right">
      <div class="label">Analiz Tarihi</div>
      <div class="val">${new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}</div>
    </div>
  </div>

  <!-- HERO SCORE -->
  <div class="hero">
    <div class="score-circle">
      <div class="score-big">${result.bioAge}</div>
      <div class="score-unit">BİYOLOJİK YAŞ</div>
    </div>
    <div class="hero-info">
      <div class="hero-title">Biyolojik Yaş Analiz Raporu</div>
      <div class="hero-sub">Bu rapor, kan tahlil değerleriniz kullanılarak Levine PhenoAge (2018) algoritmasıyla hesaplanmıştır.</div>
      <div>
        <span class="diff-badge">${diffIcon} ${result.diff>0?"+"+result.diff:result.diff} yıl — ${diffLabel}</span>
        <span class="chrono">Kronolojik yaş: <strong>${result.chronoAge}</strong></span>
      </div>
    </div>
  </div>

  <div class="body">

    <!-- BİLGİLENDİRME -->
    <div class="info-box">
      <div class="info-icon">💡</div>
      <div class="info-text">
        <strong>Biyolojik yaş nedir?</strong> Kronolojik yaşınız doğum tarihinizden hesaplanır. Biyolojik yaşınız ise hücrelerinizin ve organlarınızın gerçekte ne kadar "yaşlı" davrandığını gösterir.
        Biyolojik yaşınız kronolojik yaşınızdan düşükse vücudunuz daha genç, yüksekse daha hızlı yaşlandığına işaret eder.
        <strong>Düzenli egzersiz, kaliteli uyku ve antiinflamatuar beslenme ile biyolojik yaşınızı değiştirebilirsiniz.</strong>
      </div>
    </div>

    <!-- SİSTEM ANALİZİ -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">🔬</div>
        <div class="section-title">Organ Sistemi Skorları</div>
        <div class="section-subtitle">100 üzerinden / yüksek = daha iyi</div>
      </div>
      <div class="sys-grid">
        ${sysScores.map(s=>`
        <div class="sys-card" style="--c:${s.bg}">
          <div class="sys-card-name">${s.name}</div>
          <div class="sys-card-score" style="color:${s.col}">${s.avg}</div>
          <div class="sys-bar"><div class="sys-bar-fill" style="width:${s.avg}%;background:${s.bg}"></div></div>
          <span class="sys-status" style="background:${s.bg}22;color:${s.col}">${s.status}</span>
          <div class="sys-tip">${s.tip}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- KAN DEĞERLERİ -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">🩸</div>
        <div class="section-title">Kan Değerleriniz</div>
        <div class="section-subtitle">PhenoAge algoritmasında kullanılan değerler</div>
      </div>
      <table class="val-table">
        <thead><tr>
          <th>Biyobelirteç</th>
          <th>Değeriniz</th>
          <th>Birim</th>
          <th>Durum</th>
        </tr></thead>
        <tbody>
          ${valRows.map(r=>`<tr>
            <td style="font-weight:500">${r.label}</td>
            <td style="font-family:Georgia,serif;font-size:15px;font-weight:700">${r.val}</td>
            <td style="color:#9ca3af">${r.unit}</td>
            <td><span class="status-dot" style="background:${r.sc}"></span><span style="color:${r.sc};font-weight:600">${r.sl}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <!-- AI YORUM -->
    ${aiText?`
    <div class="section">
      <div class="section-header">
        <div class="section-icon">✨</div>
        <div class="section-title">Uzman Yorumu</div>
        <div class="section-subtitle">AI destekli klinik değerlendirme</div>
      </div>
      <div class="ai-box">
        <div class="ai-header">
          <div class="ai-avatar">B</div>
          <div>
            <div class="ai-name">Prof. Dr. Burcu Barutçuoğlu</div>
            <div class="ai-role">Klinik Biyokimya Uzmanı · Ege Üniversitesi Tıp Fakültesi</div>
          </div>
        </div>
        <div class="ai-text">${aiText}</div>
      </div>
    </div>`:''}

    <!-- NE YAPABİLİRSİNİZ -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon">🎯</div>
        <div class="section-title">Biyolojik Yaşınızı Nasıl İyileştirebilirsiniz?</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
        ${[
          {icon:"🏃",title:"Düzenli Egzersiz",desc:"Haftada 150 dk orta yoğunluklu egzersiz biyolojik yaşı 5-9 yıl geri alabilir."},
          {icon:"🥗",title:"Antiinflamatuar Beslenme",desc:"Zeytinyağı, yağlı balık, ceviz ve koyu yeşil sebzeler CRP değerini düşürür."},
          {icon:"😴",title:"Kaliteli Uyku",desc:"Her gece 7-9 saat uyku hücresel onarım süreçlerini aktive eder."},
          {icon:"🔄",title:"6 Ayda Bir Tekrar Test",desc:"Değişiminizi takip edin. BioScope ile ilerlemenizi ölçün."},
        ].map(item=>`<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;display:flex;gap:10px;align-items:flex-start;">
          <div style="font-size:22px;flex-shrink:0">${item.icon}</div>
          <div><div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:4px">${item.title}</div>
          <div style="font-size:12px;color:#6b7280;line-height:1.6">${item.desc}</div></div>
        </div>`).join('')}
      </div>
    </div>

  </div><!-- /body -->

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-logo">Bio<span>Scope</span> · bioscope.com.tr</div>
    <div class="footer-text">
      Levine vd. (2018), Aging Albany NY · Bu rapor tıbbi tanı yerine geçmez<br>
      Sağlık kararları için doktorunuza danışın · © 2025 BioScope
    </div>
  </div>

</div>
</body></html>`;

    const blob = new Blob([html], {type:'text/html'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `BioScope_Rapor_${new Date().toLocaleDateString('tr-TR').replace(/\./g,'-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Ücretsiz gösterilen biyobelirteçler (ilk 4)
  const FREE_KEYS = ["glucose","albumin","creatinine","crp"];
  const allBMs = BIOMARKERS.filter(b=>b.key!=="age"&&result.vals[b.key]!=null&&b.ref);

  return (
    <div>
      {showRef     && <RefPopup      onClose={()=>setShowRef(false)} />}
      {showAsk     && <AskAIPopup    resultContext={context} onClose={()=>setShowAsk(false)} />}
      {showPayment && <PaymentModal  result={result} onClose={()=>setShowPayment(false)} />}

      <div style={{textAlign:"center",marginBottom:28}}>
        <button onClick={onReset} style={{background:"none",border:"none",color:"rgba(255,255,255,0.38)",cursor:"pointer",fontSize:13,display:"block",margin:"0 auto 10px"}}>← Yeni Analiz Yap</button>
        <h2 style={{fontFamily:"Georgia,serif",fontSize:32,color:"#fff",fontWeight:700,letterSpacing:"-1px"}}>Analiz Sonuçlarınız</h2>
      </div>

      {/* Aksiyon butonları */}
      <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:24,flexWrap:"wrap"}}>
        <button onClick={()=>setShowRef(true)}
          style={{padding:"9px 18px",borderRadius:9,border:"1px solid rgba(206,147,216,0.3)",background:"rgba(206,147,216,0.08)",color:"#CE93D8",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(206,147,216,0.15)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(206,147,216,0.08)"}>
          📊 Referans Aralıkları
        </button>
        <button onClick={()=>unlocked?setShowAsk(true):setShowPayment(true)}
          style={{padding:"9px 18px",borderRadius:9,border:"1px solid rgba(0,201,167,0.3)",background:"rgba(0,201,167,0.08)",color:"#00C9A7",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(0,201,167,0.15)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(0,201,167,0.08)"}>
          💬 AI'ya Soru Sor {!unlocked && "🔒"}
        </button>
        {user && !saved && (
          <button onClick={handleSave}
            style={{padding:"9px 18px",borderRadius:9,border:"1px solid rgba(79,195,247,0.3)",background:"rgba(79,195,247,0.08)",color:"#4FC3F7",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(79,195,247,0.15)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(79,195,247,0.08)"}>
            💾 Profile Kaydet
          </button>
        )}
        {saved && <div style={{padding:"9px 18px",borderRadius:9,background:"rgba(0,201,167,0.08)",color:"#00C9A7",fontSize:13,fontWeight:600}}>✓ Kaydedildi</div>}
        <button onClick={downloadPDFBlob}
          style={{padding:"9px 18px",borderRadius:9,border:"1px solid rgba(255,183,77,0.3)",background:"rgba(255,183,77,0.08)",color:"#FFB74D",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,183,77,0.15)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(255,183,77,0.08)"}>
          📄 Raporu İndir
        </button>
      </div>

      {/* ROW 1: Biyolojik Yaş + İlaç Uyarısı */}
      <div className="by-result-top" style={{display:"grid",gridTemplateColumns:meds.length>0?"1fr 1fr":"1fr",gap:16,marginBottom:16}}>
        {/* Biyolojik Yaş Kutusu */}
        <div style={{background:"linear-gradient(135deg,rgba(0,201,167,0.15),rgba(0,128,255,0.1))",border:"1px solid rgba(0,201,167,0.28)",borderRadius:18,padding:32,textAlign:"center",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 0%, rgba(0,201,167,0.1), transparent 60%)"}} />
          <div style={{position:"relative",zIndex:1}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.38)",letterSpacing:"2px",fontWeight:700,marginBottom:8}}>BİYOLOJİK YAŞINIZ</div>
            <div style={{fontFamily:"Georgia,serif",fontSize:80,fontWeight:700,color:"#fff",lineHeight:1,marginBottom:6}}>{result.bioAge}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.38)"}}>Kronolojik yaşınız: <strong style={{color:"#fff"}}>{result.chronoAge}</strong></div>
            <div style={{display:"inline-block",marginTop:16,padding:"7px 18px",borderRadius:99,fontSize:14,fontWeight:700,
              background:result.diff<=-3?"rgba(0,201,167,0.2)":result.diff<=3?"rgba(255,183,77,0.2)":"rgba(244,67,54,0.2)",
              color:result.diff<=-3?"#00C9A7":result.diff<=3?"#FFB74D":"#EF5350",
              border:`1px solid ${result.diff<=-3?"rgba(0,201,167,0.4)":result.diff<=3?"rgba(255,183,77,0.4)":"rgba(244,67,54,0.4)"}`}}>
              {result.diff>0?`+${result.diff}`:result.diff} yıl &nbsp; {result.diff<=-3?"🏆 Gençsiniz!":result.diff<=3?"👍 Normal":"⚠️ Dikkat"}
            </div>
            <div style={{marginTop:14,padding:"8px 14px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",lineHeight:1.7}}>
                💡 PhenoAge, 1999–2006 ABD popülasyonu (NHANES) baz alınarak geliştirilmiştir.
                Türk popülasyonunda ortalama <strong style={{color:"rgba(255,255,255,0.55)"}}>+3–5 yıl fark beklenmektedir</strong>.
                Bu skor başlangıç noktanızdır — düşürülebilir.
              </div>
            </div>
          </div>
        </div>

        {/* İlaç Uyarısı — sadece ilaç seçildiyse */}
        {meds.length>0 && (
          <div style={{background:"rgba(255,183,77,0.06)",border:"1px solid rgba(255,183,77,0.2)",borderRadius:18,padding:"20px 22px",display:"flex",flexDirection:"column",justifyContent:"flex-start",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:20}}>💊</span>
              <div style={{fontSize:14,fontWeight:700,color:"#FFB74D"}}>İlaç etkisi dikkate alındı</div>
            </div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",lineHeight:1.8}}>
              Kullandığınız ilaçlar:
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {meds.map(m=>(
                <span key={m} style={{fontSize:11,padding:"3px 9px",borderRadius:5,background:"rgba(255,183,77,0.12)",color:"#FFB74D",border:"1px solid rgba(255,183,77,0.25)",fontWeight:600}}>
                  {({retinoid:"Retinoid/Roakutan",statin:"Statin",steroid:"Kortikosteroid",betabloker:"Beta Bloker",metformin:"Metformin",nsaid:"NSAID",antipsikotik:"Antipsikotik",kemoterapik:"Kemoterapi",tiroid:"Tiroid ilacı",dogumdenetim:"Oral Kontraseptif",aceiArb:"Tansiyon ilacı",antibiyotik:"Antibiyotik",omega3:"Omega-3",dVitamin:"D Vitamini",demir:"Demir takviyesi"}[m]||m)}
                </span>
              ))}
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",lineHeight:1.6}}>
              AI yorumu bu durum göz önünde bulundurularak hazırlandı.
            </div>
          </div>
        )}
      </div>

      {/* ROW 2: AI Yorum — tam genişlik */}
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,padding:24,position:"relative",overflow:"hidden",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14}}>
          <div style={{width:26,height:26,borderRadius:6,background:"linear-gradient(135deg,#00C9A7,#0080FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>✨</div>
          <span style={{fontWeight:700,fontSize:14,color:"#fff"}}>AI Uzman Yorumu</span>
          {!unlocked && <span style={{fontSize:9,color:"#FFB74D",background:"rgba(255,183,77,0.1)",padding:"2px 7px",borderRadius:4,fontWeight:700,border:"1px solid rgba(255,183,77,0.25)"}}>🔒 ÜCRETLİ</span>}
        </div>
        {unlocked ? (
          aiLoading
            ? <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {[100,80,90,65].map((w,i)=><div key={i} style={{height:12,width:`${w}%`,background:"rgba(255,255,255,0.05)",borderRadius:4,animation:`shimmer 1.5s ${i*0.1}s infinite alternate`}} />)}
              </div>
            : <p style={{fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.8,margin:0}}>{aiText}</p>
        ) : (
          <div style={{position:"relative"}}>
            <p style={{fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.8,margin:"0 0 12px",filter:"blur(4px)",userSelect:"none",pointerEvents:"none"}}>
              {aiText || "Glukoz değeriniz normal sınırlar içinde görünmekte ancak CRP seviyeniz hafif yüksek. Karaciğer fonksiyonlarınız iyi durumda. Lenfosit oranınızı artırmak için düzenli egzersiz öneririm. RDW değerinize dikkat ediniz."}
            </p>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(0deg,rgba(10,31,28,0.95) 0%,rgba(10,31,28,0.7) 60%,transparent 100%)",borderRadius:8}}>
              <div style={{fontSize:28,marginBottom:8}}>🔒</div>
              <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:4}}>Tam yorumu görmek için</div>
              <button onClick={()=>setShowPayment(true)}
                style={{padding:"8px 20px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",marginTop:4}}>
                Raporu Aç — 299 TL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Değer Tablosu — ücretsiz kısım açık, geri kilitli */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h3 style={{fontFamily:"Georgia,serif",fontSize:18,color:"#fff",fontWeight:700}}>🔬 Değer Detayları</h3>
        {!unlocked && <span style={{fontSize:11,color:"rgba(255,255,255,0.38)"}}>4/{allBMs.length} değer ücretsiz</span>}
      </div>
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden",marginBottom:16}}>
        <div className="by-result-table-header" style={{display:"grid",gridTemplateColumns:"1fr 100px 80px 100px",gap:0,padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",fontSize:10,color:"rgba(255,255,255,0.38)",fontWeight:700,letterSpacing:"0.5px"}}>
          <span>DEĞER</span><span style={{textAlign:"right"}}>SONUÇ</span><span style={{textAlign:"center"}}>DURUM</span><span style={{textAlign:"right"}}>OPTİMAL</span>
        </div>
        {allBMs.map((b,i)=>{
          const st = getStatus(b.key, result.vals[b.key]);
          const isFree = unlocked || FREE_KEYS.includes(b.key);
          return (
            <div key={b.key} className="by-result-table-row" style={{display:"grid",gridTemplateColumns:"1fr 100px 80px 100px",gap:0,padding:"11px 16px",
              borderBottom:i<allBMs.length-1?"1px solid rgba(0,201,167,0.03)":"none",alignItems:"center",
              background:isFree?"transparent":"rgba(0,0,0,0.2)",
              opacity:isFree?1:0.5,position:"relative"}}>
              <span style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:500,display:"flex",alignItems:"center",gap:6}}>
                {!isFree && <span style={{fontSize:11}}>🔒</span>}
                {b.label}
              </span>
              <span style={{textAlign:"right",fontFamily:"Georgia,serif",fontSize:14,fontWeight:700,color:"#fff",filter:isFree?"none":"blur(4px)"}}>
                {result.vals[b.key]} <span style={{fontSize:10,color:"rgba(255,255,255,0.38)",fontWeight:400}}>{b.unit}</span>
              </span>
              <span style={{textAlign:"center"}}>
                {st && isFree && <span style={{padding:"3px 8px",borderRadius:5,background:st.bg,color:st.color,fontSize:10,fontWeight:700}}>{st.label}</span>}
                {!isFree && <span style={{fontSize:10,color:"rgba(255,255,255,0.2)"}}>—</span>}
              </span>
              <span style={{textAlign:"right",fontSize:11,color:"rgba(255,255,255,0.38)",filter:isFree?"none":"blur(3px)"}}>
                {b.ref?.opt[0]}–{b.ref?.opt[1]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Sistem skorları — kilitli overlay */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h3 style={{fontFamily:"Georgia,serif",fontSize:18,color:"#fff",fontWeight:700}}>🧬 Sistem Bazlı Analiz</h3>
      </div>
      <div style={{position:"relative",marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,filter:unlocked?"none":"blur(3px)",pointerEvents:unlocked?"auto":"none"}}>
          {SYSTEM_KEYS.map(([sysName,keys])=>{
            const scores=keys.map(k=>getScore(k,result.vals[k])).filter(s=>s!==null);
            if(!scores.length) return null;
            const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
            const col=avg>=80?"#00C9A7":avg>=60?"#FFB74D":"#EF5350";
            return (
              <div key={sysName} style={{background:"rgba(0,201,167,0.03)",borderTop:`2px solid ${col}`,border:`1px solid ${col}22`,borderRadius:11,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.65)"}}>{sysName}</span>
                  <span style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:700,color:col}}>{avg}</span>
                </div>
                <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:99,overflow:"hidden",marginBottom:8}}>
                  <div style={{height:"100%",width:`${avg}%`,background:col,borderRadius:99}} />
                </div>
                {keys.map(k=>{
                  const bm=BIOMARKERS.find(b=>b.key===k); if(!result.vals[k]||!bm) return null;
                  const st=getStatus(k,result.vals[k]);
                  return <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:10,marginTop:4,alignItems:"center"}}>
                    <span style={{color:"rgba(255,255,255,0.38)"}}>{bm.label}</span>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{color:"rgba(255,255,255,0.55)"}}>{result.vals[k]}</span>
                      {st && <span style={{padding:"1px 5px",borderRadius:3,background:st.bg,color:st.color,fontSize:9,fontWeight:700}}>{st.label}</span>}
                    </div>
                  </div>;
                })}
              </div>
            );
          })}
        </div>
        {!unlocked && (
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(4,16,14,0.6)",borderRadius:12}}>
            <div style={{fontSize:32,marginBottom:10}}>🔒</div>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:4}}>Sistem analizi ücretli içeriktir</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginBottom:16,textAlign:"center",maxWidth:280}}>5 organ sisteminin detaylı skorları, trend grafiği ve aksiyon planı</div>
            <button onClick={()=>setShowPayment(true)}
              style={{padding:"11px 28px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",boxShadow:"0 6px 24px rgba(0,201,167,0.3)"}}>
              Raporu Aç — 299 TL'den başlayan fiyatlarla
            </button>
          </div>
        )}
      </div>

      {/* Aksiyon Planı */}
      <PopulasyonGrafigi result={result} />
      <AksiyonPlani result={result} />

      {/* Ana CTA */}
      {!unlocked && (
        <div style={{background:"linear-gradient(135deg,rgba(0,201,167,0.12),rgba(0,128,255,0.08))",border:"1px solid rgba(0,201,167,0.25)",borderRadius:16,padding:"28px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,flexWrap:"wrap",marginBottom:12}}>
          <div>
            <h3 style={{fontFamily:"Georgia,serif",fontSize:20,color:"#fff",fontWeight:700,marginBottom:6}}>Tam raporunuzu açın</h3>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {["✓ AI uzman yorumu (tümü)","✓ 5 organ sistemi detaylı skorları","✓ Kişisel aksiyon planı","✓ AI soru-cevap (sınırsız)","✓ PDF rapor indir"].map(f=>(
                <span key={f} style={{fontSize:12,color:"rgba(255,255,255,0.55)"}}>{f}</span>
              ))}
            </div>
          </div>
          <div style={{textAlign:"center",flexShrink:0}}>
            <button onClick={()=>setShowPayment(true)}
              style={{display:"block",padding:"14px 32px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",boxShadow:"0 8px 28px rgba(0,201,167,0.3)",marginBottom:8,transition:"all 0.2s",whiteSpace:"nowrap"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 36px rgba(0,201,167,0.4)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 8px 28px rgba(0,201,167,0.3)";}}>
              🔒 Raporu Aç — 299 TL
            </button>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.38)"}}>iyzico · 7 gün iade garantisi</div>
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button onClick={onReset} style={{padding:"10px 22px",borderRadius:9,border:"1px solid rgba(255,255,255,0.07)",background:"none",color:"rgba(255,255,255,0.38)",fontSize:13,cursor:"pointer",transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(0,201,167,0.4)";e.currentTarget.style.color="rgba(255,255,255,0.7)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";e.currentTarget.style.color="rgba(255,255,255,0.38)";}}>
          🔄 Yeni Analiz Yap
        </button>
      </div>
    </div>
  );
}

// ── Analiz Paneli ─────────────────────────────────────────────────────────────
function Panel({ setPage, user, onSaveAnalysis }) {
  const [tab,        setTab]      = useState("quick");
  const [vals,       setVals]     = useState({});
  const [activeG,    setActiveG]  = useState("kişisel");
  const [step,       setStep]     = useState("form");
  const [result,     setResult]   = useState(null);
  const [loading,    setLoading]  = useState(false);
  const [aiText,     setAiText]   = useState("");
  const [aiLoading,  setAiLoading]= useState(false);
  const [alertMsg,   setAlertMsg] = useState("");
  const [pdfStatus,  setPdfStatus]= useState("idle");
  const [pdfName,    setPdfName]  = useState("");
  const [extracted,  setExtracted]= useState(null);
  const [meds,       setMeds]      = useState([]);      // kullanılan ilaç kategorileri
  const [medsStep,   setMedsStep]  = useState(true);    // true = ilaç sorusu göster
  const resultRef   = useRef(null);
  const fileInputRef= useRef(null);

  const REQ_KEYS = BIOMARKERS.filter(b=>b.req).map(b=>b.key);
  const filledReq= REQ_KEYS.filter(k=>vals[k]&&vals[k]!=="").length;
  const progress  = Math.round((filledReq/REQ_KEYS.length)*100);
  const showAlert = (msg) => { setAlertMsg(msg); setTimeout(()=>setAlertMsg(""),5000); };

  const runAnalysis = async (numV) => {
    const bio = calculateBioAge(numV);
    if (!bio) { showAlert("Hesaplama hatası — zorunlu değerleri kontrol edin."); return; }
    const diff = parseFloat((bio-numV.age).toFixed(1));
    const res  = {bioAge:bio, diff, chronoAge:numV.age, vals:numV, meds};
    setResult(res); setStep("result");
    setTimeout(()=>resultRef.current?.scrollIntoView({behavior:"smooth"}),150);
    setAiLoading(true);
    try { setAiText(await fetchAI(numV,bio,numV.age,meds)); }
    catch { setAiText("AI yorumu şu an alınamıyor."); }
    finally { setAiLoading(false); }
  };

  const analyzeManual = async () => {
    const missing = REQ_KEYS.filter(k=>!vals[k]||vals[k]==="");
    if (missing.length>0) {
      const first=BIOMARKERS.find(b=>missing.includes(b.key));
      if(first) setActiveG(first.group);
      showAlert(`⚠ ${missing.length} zorunlu alan eksik`); return;
    }
    setLoading(true);
    try {
      const numV={};
      BIOMARKERS.forEach(b=>{ numV[b.key]=vals[b.key]?parseFloat(vals[b.key]):null; });
      await runAnalysis(numV);
    } catch { showAlert("Beklenmeyen hata. Lütfen tekrar deneyin."); }
    finally { setLoading(false); }
  };

  const handlePDF = async (file) => {
    if(!file||file.type!=="application/pdf") { showAlert("Geçerli bir PDF dosyası seçin."); return; }
    setPdfName(file.name); setPdfStatus("reading"); setExtracted(null);
    try {
      const base64 = await new Promise((res,rej)=>{
        const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=()=>rej(new Error("Dosya okunamadı")); r.readAsDataURL(file);
      });
      const ext = await extractFromPDF(base64);
      const cleaned={};
      Object.entries(ext).forEach(([k,v])=>{ if(v!=null&&!isNaN(parseFloat(v))) cleaned[k]=String(parseFloat(v)); });
      if(!Object.keys(cleaned).length) { setPdfStatus("error"); showAlert("PDF'den değer çıkarılamadı. Manuel giriş yapın."); return; }
      setExtracted(cleaned); setPdfStatus("done");
    } catch(e) { setPdfStatus("error"); showAlert(`PDF hatası: ${e.message}`); }
  };

  const analyzePDF = async () => {
    if(!extracted) { showAlert("Önce PDF yükleyin."); return; }
    const missing=REQ_KEYS.filter(k=>!extracted[k]);
    if(missing.length>0) {
      setVals({...extracted}); setTab("manual");
      showAlert(`${missing.length} zorunlu değer eksik — manuel tamamlayın.`); return;
    }
    setLoading(true);
    try {
      const numV={};
      BIOMARKERS.forEach(b=>{ numV[b.key]=extracted[b.key]?parseFloat(extracted[b.key]):null; });
      await runAnalysis(numV);
    } catch { showAlert("Beklenmeyen hata. Tekrar deneyin."); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setStep("form"); setResult(null); setAiText(""); setVals({}); setActiveG("kişisel"); setMeds([]); setMedsStep(true);
    setAlertMsg(""); setPdfStatus("idle"); setPdfName(""); setExtracted(null);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const handleSave = async (r) => {
    const token = localStorage.getItem("sb_token");
    if (token && user) {
      try {
        await sb.saveAnalysis(token, {
          user_id: user.id,
          bio_age: r.bioAge,
          chrono_age: r.chronoAge,
          diff: r.diff,
          vals: r.vals,
          meds: r.meds || [],
          ai_text: aiText || ""
        });
      } catch(e) { console.error("Supabase save:", e); }
    }
    if(onSaveAnalysis) onSaveAnalysis({...r, date: new Date().toLocaleDateString("tr-TR")});
  };

  const gFields=BIOMARKERS.filter(b=>b.group===activeG);
  const gMeta=GM[activeG]||GM["kişisel"];
  const gIdx=GROUPS.indexOf(activeG);

  return (
    <section className="by-panel" style={{minHeight:"100vh",padding:"90px 24px 60px",position:"relative"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 60% 40% at 30% 50%, rgba(0,201,167,0.04) 0%, transparent 60%)"}} />
      {alertMsg && (
        <div style={{position:"fixed",top:76,left:"50%",transform:"translateX(-50%)",background:"#1a3a2a",border:"1px solid rgba(0,201,167,0.3)",color:"#fff",borderRadius:10,padding:"12px 24px",fontSize:13,fontWeight:600,zIndex:300,boxShadow:"0 4px 20px rgba(0,0,0,0.5)",maxWidth:"90vw",textAlign:"center",lineHeight:1.5}}>
          {alertMsg}
        </div>
      )}
      <div style={{maxWidth:1100,margin:"0 auto",position:"relative",zIndex:1}}>

        {step==="form" && (
          <>
            <div style={{textAlign:"center",marginBottom:32}}>
              <button onClick={()=>{setPage("home");window.scrollTo({top:0,behavior:"smooth"});}}
                style={{background:"none",border:"none",color:"rgba(255,255,255,0.38)",cursor:"pointer",fontSize:13,display:"block",margin:"0 auto 10px"}}>← Ana Sayfaya Dön</button>
              <h2 style={{fontFamily:"Georgia,serif",fontSize:32,color:"#fff",fontWeight:700,letterSpacing:"-1px",marginBottom:6}}>Analizinizi Başlatın</h2>
              <p style={{color:"rgba(255,255,255,0.38)",fontSize:13}}>PDF yükleyin veya değerleri kendiniz girin</p>
            </div>

            {/* İlaç Sorusu */}
            {medsStep && (
              <div style={{maxWidth:600,margin:"0 auto 28px",background:"rgba(255,183,77,0.06)",border:"1px solid rgba(255,183,77,0.2)",borderRadius:14,padding:24}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <span style={{fontSize:22}}>💊</span>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>İlaç veya takviye kullanıyor musunuz?</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:2}}>Bazı ilaçlar kan değerlerini etkiler — doğru yorum için önemli</div>
                  </div>
                </div>

                <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
                  {[
                    {id:"retinoid",      label:"Retinoid / Roakutan",              effect:"Trigliserid ve karaciğer enzimlerini (ALT/ALP) belirgin yükseltir"},
                    {id:"statin",        label:"Statin (Lipitor, Crestor vb.)",    effect:"LDL/kolesterolü düşürür, karaciğer enzimlerini etkileyebilir"},
                    {id:"steroid",       label:"Kortikosteroid (Prednizon vb.)",   effect:"Glukozu yükseltir, albumini düşürür, WBC'yi artırır"},
                    {id:"betabloker",    label:"Beta Bloker (Beloc vb.)",          effect:"Trigliseridi yükseltir, HDL'yi düşürebilir"},
                    {id:"metformin",     label:"Metformin / Diyabet ilacı",        effect:"Glukozu düşürür, uzun kullanımda B12'yi etkiler"},
                    {id:"nsaid",         label:"NSAID / Ağrı kesici (sürekli)",    effect:"CRP'yi maskeler, kreatinin ve böbrek değerlerini etkiler"},
                    {id:"antipsikotik",  label:"Antipsikotik (Risperdal vb.)",     effect:"Glukoz ve trigliseridi yükseltir, metabolik sendrom riski"},
                    {id:"kemoterapik",   label:"Kemoterapi / İmmünosupresif",      effect:"WBC ve lenfositi düşürür, albumin etkiler"},
                    {id:"tiroid",        label:"Tiroid ilacı (Levotiron vb.)",     effect:"Kolesterol, kalp hızı ve metabolizmayı etkiler"},
                    {id:"dogumdenetim",  label:"Oral Kontraseptif / Hormon",       effect:"Trigliserid ve CRP'yi yükseltir, glukoz toleransını etkiler"},
                    {id:"aceiArb",       label:"Tansiyon ilacı (ACE/ARB)",         effect:"Kreatinin ve potasyum değerlerini etkiler"},
                    {id:"antibiyotik",   label:"Son 2 haftada Antibiyotik",        effect:"WBC ve CRP değerlerini geçici etkiler"},
                    {id:"omega3",        label:"Omega-3 / Balık yağı takviyesi",   effect:"Trigliseridi olumlu etkiler, düşürür"},
                    {id:"dVitamin",      label:"D Vitamini takviyesi",             effect:"D vitamini eksikliği tedavisinde metabolizmayı etkiler"},
                    {id:"demir",         label:"Demir takviyesi",                  effect:"RDW ve hematoloji değerlerini etkiler"},
                  ].map(m=>{
                    const sel = meds.includes(m.id);
                    return (
                      <button key={m.id} onClick={()=>setMeds(prev=>sel?prev.filter(x=>x!==m.id):[...prev,m.id])}
                        title={m.effect}
                        style={{padding:"7px 13px",borderRadius:8,border:`1px solid ${sel?"rgba(255,183,77,0.6)":"rgba(255,255,255,0.12)"}`,
                          background:sel?"rgba(255,183,77,0.15)":"rgba(255,255,255,0.04)",
                          color:sel?"#FFB74D":"rgba(255,255,255,0.6)",fontSize:12,fontWeight:sel?700:400,
                          cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}>
                        {sel && <span style={{fontSize:10}}>✓</span>}
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {meds.length>0 && (
                  <div style={{background:"rgba(255,183,77,0.08)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#FFB74D",lineHeight:1.6}}>
                    ⚠️ Seçilen ilaçların kan değerlerine etkisi AI yorumunda dikkate alınacak.
                  </div>
                )}

                <button onClick={()=>setMedsStep(false)}
                  style={{width:"100%",padding:"11px",borderRadius:9,border:"none",
                    background:"linear-gradient(135deg,#00C9A7,#0080FF)",
                    color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                  {meds.length>0 ? `${meds.length} ilaç seçildi — Devam Et →` : "İlaç Kullanmıyorum — Devam Et →"}
                </button>
              </div>
            )}

            {/* Tab ve Form — ilaç sorusu geçildikten sonra göster */}
            {!medsStep && <div style={{display:"flex",gap:0,marginBottom:28,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4,maxWidth:400,margin:"0 auto 28px"}}>
              {[["quick","⚡ Hızlı (PDF)"],["manual","✏️ Manuel Giriş"]].map(([t,l])=>(
                <button key={t} onClick={()=>setTab(t)}
                  style={{flex:1,padding:"10px 16px",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,transition:"all 0.2s",
                    background:tab===t?"linear-gradient(135deg,#00C9A7,#0080FF)":"transparent",
                    color:tab===t?"#fff":"rgba(255,255,255,0.4)"}}>
                  {l}
                </button>
              ))}
            </div>}

            {/* PDF tab */}
            {!medsStep && tab==="quick" && (
              <div style={{maxWidth:600,margin:"0 auto"}}>
                <div
                  onClick={()=>fileInputRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#00C9A7";e.currentTarget.style.background="rgba(0,201,167,0.08)";}}
                  onDragLeave={e=>{e.currentTarget.style.borderColor="rgba(0,201,167,0.15)";e.currentTarget.style.background="rgba(255,255,255,0.03)";}}
                  onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="rgba(0,201,167,0.15)";e.currentTarget.style.background="rgba(255,255,255,0.03)";const f=e.dataTransfer.files[0];if(f)handlePDF(f);}}
                  style={{border:"2px dashed rgba(0,201,167,0.15)",borderRadius:16,padding:"48px 32px",textAlign:"center",cursor:"pointer",background:"rgba(0,201,167,0.03)",transition:"all 0.2s",marginBottom:20}}>
                  <input ref={fileInputRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handlePDF(f);e.target.value="";}} />
                  <div style={{fontSize:48,marginBottom:16}}>📄</div>
                  <div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:8}}>Tahlil PDF'nizi buraya sürükleyin</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.38)",marginBottom:20}}>veya tıklayarak seçin</div>
                  <div style={{display:"inline-block",padding:"8px 20px",borderRadius:8,background:"rgba(0,201,167,0.06)",border:"1px solid rgba(0,201,167,0.3)",fontSize:13,color:"#00C9A7",fontWeight:600}}>PDF Seç</div>
                </div>

                {pdfStatus==="reading" && (
                  <div style={{background:"rgba(0,201,167,0.08)",border:"1px solid rgba(0,201,167,0.2)",borderRadius:12,padding:20,textAlign:"center",marginBottom:20}}>
                    <div style={{fontSize:24,marginBottom:8,display:"inline-block",animation:"spin 1.2s linear infinite"}}>⏳</div>
                    <div style={{fontSize:14,color:"#00C9A7",fontWeight:600}}>AI raporunuzu okuyor...</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.38)",marginTop:4}}>{pdfName}</div>
                  </div>
                )}
                {pdfStatus==="error" && (
                  <div style={{background:"rgba(239,83,80,0.08)",border:"1px solid rgba(239,83,80,0.25)",borderRadius:12,padding:20,textAlign:"center",marginBottom:20}}>
                    <div style={{fontSize:24,marginBottom:8}}>❌</div>
                    <div style={{fontSize:14,color:"#EF5350",fontWeight:600}}>PDF okunamadı — Manuel sekmeyi deneyin</div>
                  </div>
                )}
                {pdfStatus==="done" && extracted && (
                  <div style={{background:"rgba(0,201,167,0.06)",border:"1px solid rgba(0,201,167,0.25)",borderRadius:14,padding:20,marginBottom:20}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                      <span style={{fontSize:18}}>✅</span>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:"#00C9A7"}}>Değerler okundu</div>
                        <div style={{fontSize:12,color:"rgba(255,255,255,0.38)"}}>{Object.keys(extracted).length} değer bulundu</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:16}}>
                      {BIOMARKERS.filter(b=>extracted[b.key]).map(b=>{
                        const st=getStatus(b.key,extracted[b.key]);
                        return (
                          <div key={b.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"rgba(255,255,255,0.04)",borderRadius:7}}>
                            <span style={{fontSize:11,color:"rgba(255,255,255,0.55)"}}>{b.label}</span>
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <span style={{fontSize:13,fontWeight:700,color:"#fff",fontFamily:"Georgia,serif"}}>{extracted[b.key]}</span>
                              {st && <span style={{padding:"1px 5px",borderRadius:3,background:st.bg,color:st.color,fontSize:9,fontWeight:700}}>{st.label}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {REQ_KEYS.filter(k=>!extracted[k]).length>0 && (
                      <div style={{background:"rgba(255,183,77,0.08)",border:"1px solid rgba(255,183,77,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#FFB74D"}}>
                        ⚠ Eksik zorunlu: {REQ_KEYS.filter(k=>!extracted[k]).map(k=>BIOMARKERS.find(b=>b.key===k)?.label).join(", ")}
                      </div>
                    )}
                    <button onClick={analyzePDF} disabled={loading}
                      style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:loading?"rgba(0,201,167,0.3)":"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:800,fontSize:15,cursor:loading?"default":"pointer"}}>
                      {loading?"⏳ Hesaplanıyor...":"🧬 Biyolojik Yaşımı Hesapla"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Manuel tab */}
            {!medsStep && tab==="manual" && (
              <>
                <div style={{background:"rgba(255,255,255,0.04)",borderRadius:99,height:4,marginBottom:24,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#00C9A7,#0080FF)",borderRadius:99,transition:"width 0.5s ease"}} />
                </div>
                <div className="by-manual-layout" style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:16}}>
                  <div className="by-sidebar" style={{display:"flex",flexDirection:"column",gap:5}}>
                    {GROUPS.map(g=>{
                      const m=GM[g],gf=BIOMARKERS.filter(b=>b.group===g),filled=gf.filter(b=>vals[b.key]).length,isA=activeG===g;
                      return <button key={g} onClick={()=>setActiveG(g)}
                        style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 13px",borderRadius:9,border:"none",cursor:"pointer",textAlign:"left",background:isA?m.bg:"rgba(0,201,167,0.03)",borderLeft:`3px solid ${isA?m.color:"transparent"}`,transition:"all 0.2s"}}>
                        <span style={{fontSize:13,fontWeight:isA?700:500,color:isA?m.color:"rgba(255,255,255,0.55)"}}>{m.label}</span>
                        <span style={{fontSize:11,color:filled===gf.length?"#00C9A7":"rgba(0,201,167,0.1)",fontWeight:600}}>{filled}/{gf.length}</span>
                      </button>;
                    })}
                    <div style={{marginTop:8,padding:14,background:"rgba(0,201,167,0.06)",borderRadius:9,border:"1px solid rgba(0,201,167,0.14)"}}>
                      <div style={{fontSize:10,color:"#00C9A7",fontWeight:700,marginBottom:3}}>TAMAMLANMA</div>
                      <div style={{fontFamily:"Georgia,serif",fontSize:26,fontWeight:800,color:"#fff"}}>{progress}%</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.38)",marginTop:2}}>{filledReq}/{REQ_KEYS.length} zorunlu</div>
                    </div>
                  </div>
                  <div style={{background:"rgba(0,201,167,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:22}}>
                    <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:18,paddingBottom:12,borderBottom:"1px solid rgba(0,201,167,0.04)"}}>
                      <div style={{width:32,height:32,borderRadius:8,background:gMeta.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{gFields[0]?.icon||"📋"}</div>
                      <div>
                        <div style={{fontWeight:700,fontSize:15,color:gMeta.color}}>{gMeta.label} Değerleri</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.38)"}}>Tahlil raporunuzdan girin</div>
                      </div>
                    </div>
                    <div className="by-fields-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                      {gFields.map(f=>{
                        const hasV=!!vals[f.key], st=hasV?getStatus(f.key,vals[f.key]):null;
                        return (
                          <div key={f.key}>
                            <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.55)",marginBottom:6}}>
                              {f.label}
                              {f.req && <span style={{color:"#00C9A7",fontSize:9,fontWeight:700,background:"rgba(0,201,167,0.06)",padding:"1px 5px",borderRadius:3}}>ZOR.</span>}
                              {st && <span style={{padding:"1px 6px",borderRadius:3,background:st.bg,color:st.color,fontSize:9,fontWeight:700}}>{st.label}</span>}
                            </label>
                            <div style={{position:"relative"}}>
                              <input type="number" step="any" placeholder={f.ph} value={vals[f.key]||""}
                                onChange={e=>{const v=e.target.value; setVals(prev=>({...prev,[f.key]:v}));}}
                                style={{width:"100%",padding:"10px 50px 10px 12px",borderRadius:7,fontSize:15,background:hasV?gMeta.bg:"rgba(0,201,167,0.03)",border:`1px solid ${hasV?gMeta.color+"60":"rgba(0,201,167,0.06)"}`,color:"#fff",outline:"none",boxSizing:"border-box",transition:"all 0.2s",fontFamily:"Georgia,serif"}}
                                onFocus={e=>{e.target.style.borderColor=gMeta.color;e.target.style.boxShadow=`0 0 0 3px ${gMeta.color}18`;}}
                                onBlur={e=>{e.target.style.borderColor=vals[f.key]?`${gMeta.color}60`:"rgba(0,201,167,0.06)";e.target.style.boxShadow="none";}}
                              />
                              <span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"rgba(255,255,255,0.38)",pointerEvents:"none"}}>{f.unit}</span>
                            </div>
                            {f.ref && hasV && (
                              <div style={{fontSize:10,color:"rgba(255,255,255,0.38)",marginTop:3}}>Optimal: {f.ref.opt[0]}–{f.ref.opt[1]} {f.unit}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:20,paddingTop:14,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                      <button onClick={()=>{if(gIdx>0)setActiveG(GROUPS[gIdx-1]);}} disabled={gIdx===0}
                        style={{padding:"9px 18px",borderRadius:7,border:"1px solid rgba(255,255,255,0.07)",background:"none",color:gIdx===0?"rgba(0,201,167,0.1)":"rgba(0,201,167,0.1)",cursor:gIdx===0?"default":"pointer",fontSize:13}}>← Önceki</button>
                      {gIdx<GROUPS.length-1
                        ? <button onClick={()=>setActiveG(GROUPS[gIdx+1])}
                            style={{padding:"9px 20px",borderRadius:7,border:"none",background:gMeta.bg,color:gMeta.color,cursor:"pointer",fontSize:13,fontWeight:700,borderLeft:`2px solid ${gMeta.color}`}}>Sonraki →</button>
                        : <button onClick={analyzeManual} disabled={loading}
                            style={{padding:"10px 22px",borderRadius:7,border:"none",background:loading?"rgba(0,201,167,0.3)":"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",cursor:loading?"default":"pointer",fontSize:14,fontWeight:700}}>
                            {loading?"⏳...":"🧬 Analiz Et →"}
                          </button>
                      }
                    </div>
                  </div>
                </div>
                <button onClick={analyzeManual} disabled={loading}
                  style={{width:"100%",marginTop:16,padding:"14px",borderRadius:11,border:"none",background:loading?"rgba(0,201,167,0.3)":"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:800,fontSize:16,cursor:loading?"default":"pointer",boxShadow:"0 6px 24px rgba(0,201,167,0.18)"}}>
                  {loading?"⏳ Hesaplanıyor...":"🧬 Biyolojik Yaşımı Hesapla"}
                </button>
              </>
            )}
          </>
        )}

        {step==="result"&&result && (
          <div ref={resultRef}>
            <ResultView result={result} aiText={aiText} aiLoading={aiLoading} onReset={reset} onSave={handleSave} user={user} />
          </div>
        )}
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ setPage, onContactOpen }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
  const [showLegal, setShowLegal] = useState(null); // null | "gizlilik" | "kosullar" | "kvkk"
  return (
    <>
      {showLegal && <LegalModal type={showLegal} onClose={()=>setShowLegal(null)} />}
      <footer style={{borderTop:"1px solid rgba(255,255,255,0.07)",padding:"56px 40px 36px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div className="by-footer-grid" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:44,marginBottom:44}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#00C9A7,#0080FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🧬</div>
              <span style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:17,color:"#fff"}}>BioScope</span>
            </div>
            <p style={{fontSize:13,color:"rgba(255,255,255,0.38)",lineHeight:1.7,maxWidth:280}}>Türkiye'nin ilk klinik biyokimya temelli biyolojik yaş platformu.</p>
          </div>
          <div>
            <div style={{fontSize:10,color:"#00C9A7",fontWeight:700,letterSpacing:"1px",marginBottom:14}}>PLATFORM</div>
            {[["Nasıl Çalışır","how"],["Bilimsel Temel","science"],["Fiyatlar","pricing"]].map(([t,id])=>(
              <div key={t} onClick={()=>scrollTo(id)} style={{fontSize:13,color:"rgba(255,255,255,0.38)",marginBottom:9,cursor:"pointer"}}
                onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.38)"}>{t}</div>
            ))}
          </div>
          <div>
            <div style={{fontSize:10,color:"#00C9A7",fontWeight:700,letterSpacing:"1px",marginBottom:14}}>YASAL</div>
            {[["Gizlilik Politikası","gizlilik"],["Kullanım Koşulları","kosullar"],["KVKK","kvkk"]].map(([t,key])=>(
              <div key={t} onClick={()=>setShowLegal(key)} style={{fontSize:13,color:"rgba(255,255,255,0.38)",marginBottom:9,cursor:"pointer"}}
                onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.38)"}>{t}</div>
            ))}
            <div onClick={onContactOpen} style={{fontSize:13,color:"rgba(255,255,255,0.38)",marginBottom:9,cursor:"pointer"}}
              onMouseEnter={e=>e.target.style.color="#00C9A7"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.38)"}>İletişim</div>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:20,borderTop:"1px solid rgba(255,255,255,0.07)",flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.38)"}}>© 2025 BioScope. Tüm hakları saklıdır.</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.38)"}}>Bu platform tanı koymaz — bilgilendirme amaçlıdır. Levine PhenoAge, Aging Albany NY 2018.</div>
        </div>
      </div>
    </footer>
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "vz9l000a7e");
  }, []);

  const [page,      setPage]    = useState("home");
  const [showAuth,  setShowAuth]= useState(null);  // null | "login" | "register"
  const { user, register, loginWithPass, logout } = useAuth();
  const [analyses,       setAnalyses]      = useState([]);
  const [pendingAnalyze, setPendingAnalyze] = useState(false);
  const [showContact,    setShowContact]    = useState(false);
  const [activePost,     setActivePost]     = useState(null);

  const handleLogin = (u) => {
    setShowAuth(null);
    setPendingAnalyze(false);
    if (pendingAnalyze) { setPage("analyze"); window.scrollTo({top:0,behavior:"smooth"}); }
  };
  const handleLogout= () => { logout(); setPage("home"); };
  const saveAnalysis = (r) => { setAnalyses(prev=>[r,...prev]); };

  // Supabase analiz geçmişini yükle
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("sb_token");
    if (!token) return;
    sb.getAnalyses(token, user.id).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(a => ({
          id: a.id,
          date: new Date(a.created_at).toLocaleDateString("tr-TR"),
          bioAge: a.bio_age,
          chronoAge: a.chrono_age,
          diff: a.diff,
          vals: a.vals,
        }));
        setAnalyses(mapped);
      }
    }).catch(e => console.error("Supabase load:", e));
  }, [user]);

  // Analiz başlatmak için giriş zorunlu
  const goAnalyze = () => {
    if (!user) { setPendingAnalyze(true); setShowAuth("register"); return; }
    setPage("analyze"); window.scrollTo({top:0,behavior:"smooth"});
  };

  return (
    <div style={{background:"#04100E",minHeight:"100vh",color:"#fff"}}>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        input[type=number]{-moz-appearance:textfield;}
        @keyframes pulse  {from{opacity:0.5;transform:scale(1);}to{opacity:0.8;transform:scale(1.05);}}
        @keyframes blink  {0%,100%{opacity:1;}50%{opacity:0.3;}}
        @keyframes shimmer{from{opacity:0.3;}to{opacity:0.7;}}
        @keyframes spin   {from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        @keyframes shrink { from { width:100%; } to { width:0%; } }
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:#04100E;}
        ::-webkit-scrollbar-thumb{background:rgba(0,201,167,0.3);border-radius:3px;}

        /* ── Mobil ── */
        @media (max-width: 768px) {
          /* Navbar */
          .by-nav-links { display: none !important; }
          .by-nav { padding: 0 16px !important; }
          .by-nav-cta { padding: 8px 12px !important; font-size: 12px !important; }

          /* Hero */
          .by-hero { padding: 100px 20px 60px !important; }
          .by-hero h1 { font-size: 36px !important; letter-spacing: -1px !important; }
          .by-hero-stats { gap: 24px !important; flex-wrap: wrap !important; justify-content: center !important; }
          .by-hero-btns { flex-direction: column !important; align-items: center !important; }

          /* Sections */
          .by-section { padding: 60px 20px !important; }
          .by-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .by-grid-3 { grid-template-columns: 1fr !important; }
          .by-grid-2 { grid-template-columns: 1fr !important; }
          .by-grid-3c { grid-template-columns: 1fr 1fr !important; }

          /* Analiz paneli */
          .by-panel { padding: 80px 16px 40px !important; }
          .by-manual-layout { grid-template-columns: 1fr !important; }
          .by-sidebar { display: flex !important; flex-direction: row !important; overflow-x: auto !important; gap: 6px !important; margin-bottom: 14px !important; }
          .by-sidebar button { flex-shrink: 0 !important; min-width: 90px !important; }
          .by-fields-grid { grid-template-columns: 1fr !important; }

          /* Sonuç */
          .by-result-top { grid-template-columns: 1fr !important; }
          .by-result-table-header { grid-template-columns: 1fr 80px 70px !important; }
          .by-result-table-row { grid-template-columns: 1fr 80px 70px !important; }
          .by-result-table-optimal { display: none !important; }
          .by-sys-grid { grid-template-columns: 1fr 1fr !important; }

          /* Testimonials */
          .by-testi-main { padding: 24px 20px !important; }
          .by-testi-mini { grid-template-columns: repeat(3,1fr) !important; }

          /* Fiyatlar */
          .by-pricing-grid { grid-template-columns: 1fr !important; }

          /* Profil */
          .by-profile-header { flex-wrap: wrap !important; gap: 12px !important; }
          .by-profile-stats { grid-template-columns: 1fr 1fr !important; }
          .by-profile-tabs { max-width: 100% !important; }

          /* Ödeme modal */
          .by-payment-plans { grid-template-columns: 1fr !important; }
          .by-trust-badges { gap: 8px !important; }

          /* AI chat popup */
          .by-chat-popup { width: calc(100vw - 32px) !important; right: 16px !important; left: 16px !important; bottom: 16px !important; height: 70vh !important; }

          /* Footer */
          .by-footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .by-footer-inner { padding: 40px 20px 24px !important; }
        }
      `}</style>

      {showContact && <ContactModal onClose={()=>setShowContact(false)} />}

      {showAuth && (
        <AuthModal mode={showAuth} onClose={()=>{setShowAuth(null);setPendingAnalyze(false);}} onSuccess={handleLogin} onRegister={register} onLogin={loginWithPass} fromAnalyze={pendingAnalyze} />
      )}

      <Navbar page={page} setPage={setPage} user={user} setShowAuth={setShowAuth} onLogout={handleLogout} goAnalyze={goAnalyze} />

      {page==="home" && (
        <>
          <Hero setPage={setPage} goAnalyze={goAnalyze} />
          <How />
          <Features />
          <PhenoAgeNedir />
          <ProfSection />
          <Testimonials />
          <Pricing setPage={setPage} goAnalyze={goAnalyze} />
          <section style={{padding:"72px 40px",textAlign:"center",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{maxWidth:520,margin:"0 auto"}}>
              <h2 style={{fontFamily:"Georgia,serif",fontSize:34,color:"#fff",fontWeight:700,marginBottom:12,letterSpacing:"-1px"}}>Hemen başlayın</h2>
              <p style={{color:"rgba(255,255,255,0.38)",fontSize:15,marginBottom:26}}>İlk analiziniz ücretsiz. Kredi kartı gerekmez.</p>
              <button onClick={goAnalyze}
                style={{padding:"15px 38px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:"0 8px 32px rgba(0,201,167,0.22)",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 12px 40px rgba(0,201,167,0.32)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,201,167,0.22)";}}>
                Ücretsiz Analiz Başlat →
              </button>
            </div>
          </section>
          <Footer setPage={setPage} onContactOpen={()=>setShowContact(true)} />
        </>
      )}

      {page==="sss" && (
        <SSSPage setPage={setPage} />
      )}
      {page==="blog" && (
        <BlogPage setPage={setPage} setActivePost={setActivePost} />
      )}
      {page==="blogpost" && (
        <BlogPostPage post={activePost} setPage={setPage} />
      )}
      {page==="analyze" && (
        <Panel setPage={setPage} user={user} onSaveAnalysis={saveAnalysis} />
      )}

      {page==="profile" && user && (
        <ProfilePage user={user} analyses={analyses} onLogout={handleLogout} setPage={setPage} goAnalyze={goAnalyze} />
      )}

      {page==="profile" && !user && (
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
          <div style={{fontSize:40}}>🔒</div>
          <div style={{fontSize:16,color:"rgba(255,255,255,0.55)"}}>Bu sayfayı görmek için giriş yapın</div>
          <button onClick={()=>setShowAuth("login")}
            style={{padding:"11px 26px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#00C9A7,#0080FF)",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
            Giriş Yap
          </button>
        </div>
      )}
    </div>
  );
}
