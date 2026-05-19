import os, sys, traceback
out_dir = r"C:\Users\hpsbm\Desktop\darko"
log_path = os.path.join(out_dir, "slice_log.txt")
try:
    src = r"C:\Users\hpsbm\AppData\Roaming\Claude\local-agent-mode-sessions\3fce3111-0c58-454b-b003-364f1c0af760\00ba76ec-450b-403b-9783-1268dfc30c51\local_1ffb99ee-9e2a-4880-a7a9-9d943550a1be\.claude\projects\C--Users-hpsbm-AppData-Roaming-Claude-local-agent-mode-sessions-3fce3111-0c58-454b-b003-364f1c0af760-00ba76ec-450b-403b-9783-1268dfc30c51-local-1ffb99ee-9e2a-4880-a7a9-9d943550a1be-outputs\eb28345a-d2ed-45b2-aafb-42869264f9d0\tool-results\mcp-plugins-search_plugins-1777283446081.txt"
    with open(src, encoding="utf-8") as f:
        data = f.read()
    chunk_size = 20000
    n = 0
    for i, start in enumerate(range(0, len(data), chunk_size)):
        end = start + chunk_size
        with open(os.path.join(out_dir, f"chunk_{i:02d}.txt"), "w", encoding="utf-8") as f:
            f.write(data[start:end])
        n += 1
    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"OK: wrote {n} chunks, total {len(data)} chars\n")
except Exception as e:
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("ERROR: " + repr(e) + "\n")
        f.write(traceback.format_exc())
