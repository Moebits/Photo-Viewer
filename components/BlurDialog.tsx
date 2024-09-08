import {ipcRenderer} from "electron"
import Slider from "rc-slider"
import React, {useEffect, useState, useRef, useContext} from "react"
import ReactDom from "react-dom"
import functions from "../structures/functions"
import "../styles/blurdialog.less"

const BlurDialog: React.FunctionComponent = (props) => {
    const initialState = {
        blur: 0.3,
        sharpen: 0.3
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
            case "blur":
                setState((prev) => {
                    return {...prev, blur: value}
                })
                ipcRenderer.invoke("apply-blur", {...state, blur: value, realTime: true})
                break
            case "sharpen":
                setState((prev) => {
                    return {...prev, sharpen: value}
                })
                ipcRenderer.invoke("apply-blur", {...state, sharpen: value, realTime: true})
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
            ipcRenderer.invoke("apply-blur", state)
        }
        closeAndReset(button === "accept")
    }

    return (
        <section className="blur-dialog" onMouseDown={close}>
            <div className="blur-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <div className="blur-container">
                    <div className="blur-title-container">
                        <p className="blur-title">Blur and Sharpen</p>
                    </div>
                    <div className="blur-row-container">
                        <div className="blur-row">
                            <p className="blur-text">Blur: </p>
                            <Slider className="blur-slider" onChange={(value) => {changeState("blur", value)}} min={0.3} max={15} step={0.1} value={state.blur}/>
                        </div>
                        <div className="blur-row">
                            <p className="blur-text">Sharpen: </p>
                            <Slider className="blur-slider" onChange={(value) => {changeState("sharpen", value)}} min={0.3} max={15} step={0.1} value={state.sharpen}/>
                        </div>
                    </div>
                    <div className="blur-button-container">
                        <button onClick={() => click("reject")} className="reject-button">{"Cancel"}</button>
                        <button onClick={() => click("accept")} className="accept-button">{"Ok"}</button>
                    </div>
                </div>
            </div>
        </section>
    )
}

ReactDom.render(<BlurDialog/>, document.getElementById("root"))