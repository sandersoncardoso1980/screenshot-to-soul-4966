<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- All app data (citizens, bookings, audit log, settings) lives in Lovable Cloud tables with RLS on and no policies; only server functions in src/lib/agenda.functions.ts touch them via the admin client after checking citizen CPF+PIN or staff credentials — there is no Supabase Auth, so direct browser access must stay locked.
- AI calls use @lovable.dev/ai-gateway only inside server functions (dynamic import in the handler); prompts never reach the browser.
