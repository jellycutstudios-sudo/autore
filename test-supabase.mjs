import { createClient } from "@supabase/supabase-js";
const supabase = createClient("https://qzbogtyosaspnvcbkgdh.supabase.co", "sb_publishable_4GEW5qeCobk1kdghAyOW2w_Kwdkkdan");
const { error } = await supabase.auth.signInWithPassword({ email: "test@test.com", password: "test" });
console.log("Error:", error);
