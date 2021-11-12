import {ipcRenderer} from "electron"
import Slider from "rc-slider"
import React, {useEffect, useState, useRef, useContext} from "react"
import ReactDom from "react-dom"
import functions from "../structures/functions"
import "../styles/hsldialog.less"

const HSLDialog: React.FunctionComponent = (props) => {
    const initialState = {
        hue: 0,
        saturation: 1,
        lightness: 0
    }
    const [state, setState] = useState(initialState)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const initTheme = async () => {
            const theme = await ipcRenderer.invoke("get-theme")
            functions.updateTheme(theme)
        }
        initTheme()
        const updateTheme = (event: any, theme: string) => {
            functions.updateTheme(theme)
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
            case "hue":
                setState((prev) => {
                    return {...prev, hue: value}
                })
                ipcRenderer.invoke("apply-hsl", {...state, hue: value, realTime: true})
                break
            case "saturation":
                setState((prev) => {
                    return {...prev, saturation: value}
                })
                ipcRenderer.invoke("apply-hsl", {...state, saturation: value, realTime: true})
                break
            case "lightness":
                setState((prev) => {
                    return {...prev, lightness: value}
                })
                ipcRenderer.invoke("apply-hsl", {...state, lightness: value, realTime: true})
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
            ipcRenderer.invoke("apply-hsl", state)
        }
        closeAndReset(button === "accept")
    }

    return (
        <section className="hsl-dialog" onMouseDown={close}>
            <div className="hsl-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <div className="hsl-container">
                    <div className="hsl-title-container">
                        <p className="hsl-title">HSL Adjustment</p>
                    </div>
                    <div className="hsl-row-container">
                        <div className="hsl-row">
                            <p className="hsl-text">Hue: </p>
                            <Slider className="hsl-slider" onChange={(value) => {changeState("hue", value)}} min={-180} max={180} step={1} value={state.hue}/>
                        </div>
                        <div className="hsl-row">
                            <p className="hsl-text">Saturation: </p>
                            <Slider className="hsl-slider" onChange={(value) => {changeState("saturation", value)}} min={0.5} max={1.5} step={0.1} value={state.saturation}/>
                        </div>
                        <div className="hsl-row">
                            <p className="hsl-text">Lightness: </p>
                            <Slider className="hsl-slider" onChange={(value) => {changeState("lightness", value)}} min={-100} max={100} step={1} value={state.lightness}/>
                        </div>
                    </div>
                    <div className="hsl-button-container">
                        <button onClick={() => click("reject")} className="reject-button">{"Cancel"}</button>
                        <button onClick={() => click("accept")} className="accept-button">{"Ok"}</button>
                    </div>
                </div>
            </div>
        </section>
    )
}

ReactDom.render(<HSLDialog/>, document.getElementById("root"))