import {ipcRenderer, remote} from "electron"
import Draggable from "react-draggable"
import React, {useEffect, useState, useRef} from "react"
import "../styles/tintdialog.less"

const TintDialog: React.FunctionComponent = (props) => {
    const initialState = {
        tint: "#ffffff"
    }
    const [state, setState] = useState(initialState)
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)
    const [clickCounter, setClickCounter] = useState(2)

    useEffect(() => {
        const showTintDialog = (event: any) => {
            setVisible((prev) => {
                const newState = !prev
                if (newState === false) closeAndReset()
                if (newState === true) setTimeout(() => {ipcRenderer.invoke("apply-tint", {...state, realTime: true})}, 100)
                return newState
            })
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "tint") closeAndReset()
        }
        const clickCounter = () => {
            setClickCounter((prev) => prev + 1)
        }
        document.addEventListener("click", clickCounter)
        ipcRenderer.on("show-tint-dialog", showTintDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-tint-dialog", showTintDialog)
            ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
            document.removeEventListener("click", clickCounter)
        }
    }, [])

    useEffect(() => {
        const enterPressed = () => {
            if (visible) click("accept")
        }
        const escapePressed = () => {
            if (visible) click("reject")
        }
        ipcRenderer.on("enter-pressed", enterPressed)
        ipcRenderer.on("escape-pressed", escapePressed)
        return () => {
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

    const closeAndReset = (noRevert?: boolean) => {
        setVisible(false)
        setState(initialState)
        if (noRevert) return
        setTimeout(() => {
            ipcRenderer.invoke("revert-to-last-state")
        }, 100)
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

    if (visible) {
        return (
            <section className="tint-dialog" onMouseDown={close}>
                <Draggable handle=".tint-title-container">
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
                </Draggable>
            </section>
        )
    }
    return null
}

export default TintDialog