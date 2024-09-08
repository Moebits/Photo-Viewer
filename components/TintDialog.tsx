import {ipcRenderer} from "electron"
import React, {useEffect, useState, useRef, useContext} from "react"
import ReactDom from "react-dom"
import functions from "../structures/functions"
import "../styles/tintdialog.less"

const TintDialog: React.FunctionComponent = (props) => {
    const initialState = {
        tint: "#ffffff"
    }
    const [state, setState] = useState(initialState)
    const [hover, setHover] = useState(false)
    const [clickCounter, setClickCounter] = useState(2)

    useEffect(() => {
        setTimeout(() => {ipcRenderer.invoke("apply-tint", {...state, realTime: true})}, 100)
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

    const changeState = (type: string, value: any) => {
        switch(type) {
            case "tint":
                setState((prev) => {
                    return {...prev, tint: value}
                })
                ipcRenderer.invoke("apply-tint", {...state, tint: value, realTime: true})
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
            if (!hover && clickCounter > 1) closeAndReset()
        }, 100)
    }

    const click = (button: "accept" | "reject") => {
        if (button === "accept") {
            ipcRenderer.invoke("apply-tint", state)
        }
        closeAndReset(button === "accept")
    }

    return (
        <section className="tint-dialog" onMouseDown={close}>
            <div className="tint-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <div className="tint-container">
                    <div className="tint-title-container">
                        <p className="tint-title">Tint</p>
                    </div>
                    <div className="tint-row-container">
                        <div className="tint-row">
                            <p className="tint-text">Color: </p>
                            <input onChange={(event) => changeState("tint", event.target.value)} onClick={() => setClickCounter(0)} type="color" className="tint-color-box" value={state.tint}></input>
                        </div>
                    </div>
                    <div className="tint-button-container">
                        <button onClick={() => click("reject")} className="reject-button">{"Cancel"}</button>
                        <button onClick={() => click("accept")} className="accept-button">{"Ok"}</button>
                    </div>
                </div>
            </div>
        </section>
    )
}

ReactDom.render(<TintDialog/>, document.getElementById("root"))