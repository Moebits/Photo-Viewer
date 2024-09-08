import {ipcRenderer} from "electron"
import Slider from "rc-slider"
import React, {useEffect, useState, useRef, useContext} from "react"
import ReactDom from "react-dom"
import functions from "../structures/functions"
import "../styles/pixelatedialog.less"

const PixelateDialog: React.FunctionComponent = (props) => {
    const initialState = {
        strength: 1
    }
    const [state, setState] = useState(initialState)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const initTheme = async () => {
            const theme = await ipcRenderer.invoke("get-theme")
            const transparency = await ipcRenderer.invoke("get-transparency")
            functions.updateTheme(theme, transparency)
        }
        initTheme()
        const updateTheme = (event: any, theme: string, transparency: boolean) => {
            functions.updateTheme(theme, transparency)
        }
        ipcRenderer.on("update-theme", updateTheme)
        return () => {
            ipcRenderer.removeListener("update-theme", updateTheme)
        }
    }, [])

    useEffect(() => {
        const keyDown = async (event: globalThis.KeyboardEvent) => {
            if (event.key === "Enter") {
                enterPressed()
            }
            if (event.key === "Escape") {
                escapePressed()
            }
        }
        const enterPressed = () => {
            click("accept")
        }
        const escapePressed = () => {
            click("reject")
        }
        document.addEventListener("keydown", keyDown)
        ipcRenderer.on("enter-pressed", enterPressed)
        ipcRenderer.on("escape-pressed", escapePressed)
        return () => {
            document.removeEventListener("keydown", keyDown)
            ipcRenderer.removeListener("enter-pressed", enterPressed)
            ipcRenderer.removeListener("escape-pressed", escapePressed)
        }
    })

    const changeState = (type: string, value: number) => {
        switch(type) {
            case "strength":
                setState((prev) => {
                    return {...prev, strength: value}
                })
                ipcRenderer.invoke("apply-pixelate", {...state, strength: value, realTime: true})
                break
        }
    }

    const closeAndReset = async (noRevert?: boolean) => {
        if (!noRevert) await ipcRenderer.invoke("revert-to-last-state")
        await ipcRenderer.invoke("close-current-dialog")
        setState(initialState)
    }
    
    const close = () => {
        setTimeout(() => {
            if (!hover) closeAndReset()
        }, 100)
    }

    const click = (button: "accept" | "reject") => {
        if (button === "accept") {
            ipcRenderer.invoke("apply-pixelate", state)
        }
        closeAndReset(button === "accept")
    }

    return (
        <section className="pixelate-dialog" onMouseDown={close}>
            <div className="pixelate-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <div className="pixelate-container">
                    <div className="pixelate-title-container">
                        <p className="pixelate-title">Pixelate</p>
                    </div>
                    <div className="pixelate-row-container">
                        <div className="pixelate-row">
                            <p className="pixelate-text">Strength: </p>
                            <Slider className="pixelate-slider" onChange={(value) => {changeState("strength", value)}} min={1} max={50} step={1} value={state.strength}/>
                        </div>
                    </div>
                    <div className="pixelate-button-container">
                        <button onClick={() => click("reject")} className="reject-button">{"Cancel"}</button>
                        <button onClick={() => click("accept")} className="accept-button">{"Ok"}</button>
                    </div>
                </div>
            </div>
        </section>
    )
}

ReactDom.render(<PixelateDialog/>, document.getElementById("root"))