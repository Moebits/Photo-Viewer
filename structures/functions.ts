import GifEncoder from "gif-encoder"
import pixels from "image-pixels"
import gifFrames from "gif-frames"
import fs from "fs"
import path from "path"

const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".tiff", ".svg"]

export default class Functions {
    public static arrayIncludes = (str: string, arr: string[]) => {
        for (let i = 0; i < arr.length; i++) {
            if (str.includes(arr[i])) return true
        }
        return false
    }

    public static arrayRemove = <T>(arr: T[], val: T) => {
        return arr.filter((item) => item !== val)
    }

    public static findDupe = (recent: any[], info: any) => {
        for (let i = recent.length - 1; i >= 0; i--) {
            if (recent[i].songUrl === info.songUrl
                && recent[i].songName === info.songName
                && recent[i].duration === info.duration) return i
        }
        return -1
    }

    public static timeout = async (ms: number) => {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    public static removeDirectory = (dir: string) => {
        if (!fs.existsSync(dir)) return
        fs.readdirSync(dir).forEach((file: string) => {
            const current = path.join(dir, file)
            if (fs.lstatSync(current).isDirectory()) {
                Functions.removeDirectory(current)
            } else {
                fs.unlinkSync(current)
            }
        })
        try {
            fs.rmdirSync(dir)
        } catch (e) {
            console.log(e)
        }
    }

    public static logSlider = (position: number) => {
        const minPos = 0
        const maxPos = 1
        const minValue = Math.log(60)
        const maxValue = Math.log(100)
        const scale = (maxValue - minValue) / (maxPos - minPos)
        const value = Math.exp(minValue + scale * (position - minPos))
        let adjusted = value - 100
        if (adjusted > 0) adjusted = 0
        return adjusted
      }

    public static formatSeconds = (duration: number) => {
        let seconds = Math.floor(duration % 60) as any
        let minutes = Math.floor((duration / 60) % 60) as any
        let hours = Math.floor((duration / (60 * 60)) % 24) as any
        if (Number.isNaN(seconds) || seconds < 0) seconds = 0
        if (Number.isNaN(minutes) || minutes < 0) minutes = 0
        if (Number.isNaN(hours) || hours < 0) hours = 0

        hours = (hours === 0) ? "" : ((hours < 10) ? "0" + hours + ":" : hours + ":")
        minutes = hours && (minutes < 10) ? "0" + minutes : minutes
        seconds = (seconds < 10) ? "0" + seconds : seconds
        return `${hours}${minutes}:${seconds}`
    }

    public static decodeEntities(encodedString: string) {
        const regex = /&(nbsp|amp|quot|lt|gt);/g
        const translate = {
            nbsp:" ",
            amp : "&",
            quot: "\"",
            lt  : "<",
            gt  : ">"
        } as any
        return encodedString.replace(regex, function(match, entity) {
            return translate[entity]
        }).replace(/&#(\d+);/gi, function(match, numStr) {
            const num = parseInt(numStr, 10)
            return String.fromCharCode(num)
        })
    }

    public static round = (value: number, step?: number) => {
        if (!step) step = 1.0
        const inverse = 1.0 / step
        return Math.round(value * inverse) / inverse
    }

    public static streamToBuffer = async (stream: NodeJS.ReadableStream) => {
        const chunks: Buffer[] = []
        const buffer = await new Promise<Buffer>((resolve, reject) => {
          stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
          stream.on("error", (err) => reject(err))
          stream.on("end", () => resolve(Buffer.concat(chunks)))
        })
        return buffer
    }

    public static getFile = async (filepath: string) => {
        const blob = await fetch(filepath).then((r) => r.blob())
        const name = path.basename(filepath).replace(".mp3", "").replace(".wav", "").replace(".flac", "").replace(".ogg", "")
        // @ts-ignore
        blob.lastModifiedDate = new Date()
        // @ts-ignore
        blob.name = name
        return blob as File
    }

    public static getSortedFiles = async (dir: string) => {
        const files = await fs.promises.readdir(dir)
        return files
            .filter((f) => imageExtensions.includes(path.extname(f)))
            .map(fileName => ({
                name: fileName,
                time: fs.statSync(`${dir}/${fileName}`).mtime.getTime(),
            }))
            .sort((a, b) => b.time - a.time)
            .map(file => file.name)
    }

    public static downloadImage = async (image: string, dest: string) => {
        if (image.startsWith("http")) {
            const arrayBuffer = await fetch(image).then((r) => r.arrayBuffer()) as any
            fs.writeFileSync(dest, Buffer.from(arrayBuffer, "binary"))
        } else if (image.startsWith("data:")) {
            const buffer = Functions.base64ToBuffer(image)
            fs.writeFileSync(dest, buffer)
        } else {
            const data = fs.readFileSync(image, "binary")
            fs.writeFileSync(dest, Buffer.from(data, "binary"))
        }
    }

    public static base64ToBuffer = (base64: string) => {
        const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)!
        return Buffer.from(matches[2], "base64")
    }

    public static bufferToBase64 = (buffer: Buffer, type: string) => {
        return `data:${type};base64,${buffer.toString("base64")}`
    }

    public static getRotateMax = (degrees: number, width: number, height: number) => {
        degrees %= 360
        const radians = (degrees * Math.PI) / 180
        const cosine = Math.cos(radians)
        const sine = Math.sin(radians)
        let w = Math.ceil(Math.abs(width * cosine) + Math.abs(height * sine)) + 1
        let h = Math.ceil(Math.abs(width * sine) + Math.abs(height * cosine)) + 1
        if (w % 2 !== 0) w++
        if (h % 2 !== 0) h++
        return Math.max(w, h, width, height)
    }

    public static encodeGIF = async (frames: Buffer[], delays: number[], width: number, height: number) => {
        const gif = new GifEncoder(width, height, {highWaterMark: 5 * 1024 * 1024})
        gif.setQuality(10)
        gif.setRepeat(0)
        gif.writeHeader()
        // gif.setTransparent(1)
        let counter = 0

        const addToGif = async (frames: Buffer[]) => {
            if (!frames[counter]) {
                gif.finish()
            } else {
                const {data} = await pixels(frames[counter])
                gif.setDelay(10 * delays[counter])
                gif.addFrame(data)
                counter++
                addToGif(frames)
            }
        }
        await addToGif(frames)
        return Functions.streamToBuffer(gif as NodeJS.ReadableStream)
    }

    public static getGIFFrames = async (image: any) => {
        const frames = await gifFrames({url: image, frames: "all", outputType: "png", cumulative: true})
        const frameArray = [] as Buffer[]
        const delayArray = [] as number[]
        for (let i = 0; i < frames.length; i++) {
            frameArray.push(await Functions.streamToBuffer(frames[i].getImage()))
            delayArray.push(frames[i].frameInfo.delay)
        }
        return {frameArray, delayArray}
    }
}
