import {ipcRenderer} from "electron"
import Slider from "rc-slider"
import React, {useEffect, useState, useRef, useContext} from "react"
import ReactDom from "react-dom"
import functions from "../structures/functions"
import downArrow from "../assets/icons/downArrow.png"
import downArrowHover from "../assets/icons/downArrow-hover.png"
import upArrow from "../assets/icons/upArrow.png"
import upArrowHover from "../assets/icons/upArrow-hover.png"
import leftArrow from "../assets/icons/leftArrow.png"
import leftArrowHover from "../assets/icons/leftArrow-hover.png"
import rightArrow from "../assets/icons/rightArrow.png"
import rightArrowHover from "../assets/icons/rightArrow-hover.png"
import "../styles/rotatedialog.less"

const RotateDialog: React.FunctionComponent = (props) => {
    const initialState = {
        degrees: 0
    }
    const [state, setState] = useState(initialState)
    const [hover, setHover] = useState(false)
    const [downHover, setDownHover] = useState(false)
    const [upHover, setUpHover] = useState(false)
    const [leftHover, setLeftHover] = useState(false)
    const [rightHover, setRightHover] = useState(false)

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
            case "degrees":
                setState((prev) => {
                    return {...prev, degrees: value}
                })
                ipcRenderer.invoke("apply-rotate", {...state, degrees: value, realTime: true})
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
            ipcRenderer.invoke("apply-rotate", state)
        }
        closeAndReset(button === "accept")
    }

    const degreeKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowUp") {
            let degrees = state.degrees + 1
            if (degrees > 180) degrees = -180
            changeState("degrees", degrees)
        } else if (event.key === "ArrowDown") {
            let degrees = state.degrees - 1
            if (degrees < -180) degrees = 180
            changeState("degrees", degrees)
        }
    }

    return (
        <section className="rotate-dialog" onMouseDown={close}>
            <div className="rotate-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <div className="rotate-container">
                    <div className="rotate-title-container">
                        <p className="rotate-title">Rotate</p>
                    </div>
                    <div className="rotate-row-container">
                        <div className="rotate-row">
                            <p className="rotate-text">Degrees: </p>
                            <input className="rotate-input" type="text" spellCheck="false" onChange={(event) => changeState("degrees", Number(event.target.value))} value={state.degrees} onKeyDown={degreeKey}/>
                        </div>
                        <div className="rotate-row">
                            <Slider className="rotate-slider" onChange={(value) => {changeState("degrees", value)}} min={-180} max={180} step={1} value={state.degrees}/>
                        </div>
                    </div>
                    <div className="rotate-arrow-container">
                        <img src={leftHover ? leftArrowHover : leftArrow} className="rotate-arrow" onClick={() => changeState("degrees", -90)} onMouseEnter={() => setLeftHover(true)} onMouseLeave={() => setLeftHover(false)} width={20} height={20}/>
                        <img src={downHover ? downArrowHover : downArrow} className="rotate-arrow" onClick={() => changeState("degrees", 180)} onMouseEnter={() => setDownHover(true)} onMouseLeave={() => setDownHover(false)} width={20} height={20}/>
                        <img src={upHover ? upArrowHover : upArrow} className="rotate-arrow" onClick={() => changeState("degrees", 0)} onMouseEnter={() => setUpHover(true)} onMouseLeave={() => setUpHover(false)} width={20} height={20}/>
                        <img src={rightHover ? rightArrowHover : rightArrow} className="rotate-arrow" onClick={() => changeState("degrees", 90)} onMouseEnter={() => setRightHover(true)} onMouseLeave={() => setRightHover(false)} width={20} height={20}/>
                    </div>
                    <div className="rotate-button-container">
                        <button onClick={() => click("reject")} className="reject-button">{"Cancel"}</button>
                        <button onClick={() => click("accept")} className="accept-button">{"Ok"}</button>
                    </div>
                </div>
            </div>
        </section>
    )
}

ReactDom.render(<RotateDialog/>, document.getElementById("root"))