# Roadmap

- [done] Security findings: fixed the three database findings (open insert rule on expenses, open upload rule and open download rule on the receipts storage) by routing the public employee submission through a validated server-side pipeline (src/lib/expense-submit.functions.ts) and dropping the permissive policies. Fresh scan: no issues. The two lov_finding_* IDs do not appear in the current scan (likely from an older scan and already resolved).
- [pending] Push project to the user's GitHub repo (Git sync — user-side connection in editor: Plus menu → GitHub → Connect project)
- [done] Dependency floor update: @tanstack/react-start@1.168.60, @tanstack/react-router@1.170.41, @tanstack/router-plugin@1.168.42 installed; build OK.
