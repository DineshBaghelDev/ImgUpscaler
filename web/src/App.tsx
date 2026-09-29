import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

type Item = { file: File; src: string; out?: string; status: "idle" | "working" | "done" | "error" }

function Compare({ before, after }: { before: string; after?: string }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-hidden rounded border">
        <img src={before} className="block w-full" style={{ imageRendering: "pixelated" }} />
        {after && (
          <>
            <img src={after} className="absolute inset-0 w-full h-full" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} />
            <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
          </>
        )}
      </div>
      {after && <Slider value={[pos]} onValueChange={(v) => setPos(Array.isArray(v) ? v[0] : v)} max={100} step={0.1} />}
    </div>
  )
}

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [size, setSize] = useState("4k")
  const [busy, setBusy] = useState(false)

  const update = (i: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)))

  async function run() {
    setBusy(true)
    for (let i = 0; i < items.length; i++) {
      update(i, { status: "working" })
      const fd = new FormData()
      fd.append("file", items[i].file)
      fd.append("size", size)
      try {
        const res = await fetch("/upscale", { method: "POST", body: fd })
        if (!res.ok) throw new Error(await res.text())
        update(i, { status: "done", out: URL.createObjectURL(await res.blob()) })
      } catch {
        update(i, { status: "error" })
      }
    }
    setBusy(false)
  }

  const outName = (f: File) => f.name.replace(/\.[^.]+$/, "") + `_${size}.png`
  const done = items.filter((i) => i.status === "done").length

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="file"
          multiple
          accept="image/*"
          className="max-w-sm"
          onChange={(e) =>
            setItems([...(e.target.files ?? [])].map((file) => ({ file, src: URL.createObjectURL(file), status: "idle" })))
          }
        />
        <Select value={size} onValueChange={(v) => v && setSize(v)}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2k">2K</SelectItem>
            <SelectItem value="4k">4K</SelectItem>
            <SelectItem value="8k">8K</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={run} disabled={busy || !items.length}>
          {busy ? "Upscaling..." : "Upscale"}
        </Button>
        <Button
          variant="outline"
          disabled={!done}
          onClick={() =>
            items.forEach((it) => {
              if (!it.out) return
              const a = document.createElement("a")
              a.href = it.out
              a.download = outName(it.file)
              a.click()
            })
          }
        >
          Download all
        </Button>
      </div>
      {busy && <Progress value={(done / items.length) * 100} />}
      {items.map((it, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {it.file.name} — {it.status}
            </CardTitle>
            {it.out && (
              <a href={it.out} download={outName(it.file)}>
                <Button size="sm">Download</Button>
              </a>
            )}
          </CardHeader>
          <CardContent>
            <Compare before={it.src} after={it.out} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
