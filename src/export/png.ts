export async function exportLookPng(svg: SVGSVGElement, lines: string[]): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', '800')
  clone.setAttribute('height', '1560')
  const xml = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = await load(url)
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 1200
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.fillStyle = '#F3EEE6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const drawW = 430
    const drawH = 860
    ctx.drawImage(image, (canvas.width - drawW) / 2, 28, drawW, drawH)
    ctx.fillStyle = '#1F1A17'
    ctx.font = '500 40px "Songti SC", "PingFang SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif'
    ctx.fillText('言衣', 72, 960)
    ctx.fillStyle = '#5E564F'
    ctx.font = '22px "PingFang SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif'
    const text = lines.slice(0, 4).join('  ·  ')
    wrap(ctx, text || '还没挑选单品', 72, 1008, 760, 32)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('png')
    const file = new File([blob], '言衣-搭配.png', { type: 'image/png' })
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
    if (nav.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: '言衣搭配' })
      return
    }
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = '言衣-搭配.png'
    a.click()
    URL.revokeObjectURL(href)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('svg'))
    image.src = url
  })
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, line: number) {
  let rest = text
  let row = 0
  while (rest && row < 3) {
    let take = rest.length
    while (take > 1 && ctx.measureText(rest.slice(0, take)).width > max) take -= 1
    ctx.fillText(rest.slice(0, take), x, y + row * line)
    rest = rest.slice(take)
    row += 1
  }
}
