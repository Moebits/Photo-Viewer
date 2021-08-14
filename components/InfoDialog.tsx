import {ipcRenderer} from "electron"
import Draggable from "react-draggable"
import React, {useEffect, useState} from "react"
import "../styles/infodialog.less"
import functions from "../structures/functions"

const InfoDialog: React.FunctionComponent = (props) => {
    const initialState = {
        name: null,
        width: 0,
        height: 0,
        format: null,
        size: 0 as any,
        dpi: 0,
        frames: 0,
        space: null
    }
    const [state, setState] = useState(initialState)
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const showinfoDialog = (event: any) => {
            setVisible((prev) => {
                const newState = !prev
                if (newState === false) close()
                if (newState === true) {
                    ipcRenderer.invoke("get-original-metadata").then((info) => {
                        setState((prev) => {
                            return {...prev, name: info.name, width: info.width, height: info.height, format: info.format, size: info.size, dpi: info.dpi, frames: info.frames, space: info.space}
                        })
                    })
                }
                return newState
            })
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "info") close()
        }
        ipcRenderer.on("show-info-dialog", showinfoDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-info-dialog", showinfoDialog)
            ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
        }
    }, [])

    const close = () => {
        if (!hover) setVisible(false)
    }

    if (visible) {
        return (
            <section className="info-dialog" onMouseDown={close}>
                <Draggable>
                <div className="info-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="info-container">
                        <div className="info-title-container">
                            <p className="info-title">Image Info</p>
                        </div>
                        <div className="info-row-container">
                            <div className="info-row">
                                <p className="info-text">Name: </p>
                                <p className="info-text-alt">{state.name}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Width: </p>
                                <p className="info-text-alt">{state.width}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Height: </p>
                                <p className="info-text-alt">{state.height}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">DPI: </p>
                                <p className="info-text-alt">{state.dpi}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Size: </p>
                                <p className="info-text-alt">{state.size === "?" ? "?" : functions.readableFileSize(state.size)}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Format: </p>
                                <p className="info-text-alt">{state.format}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Frames: </p>
                                <p className="info-text-alt">{state.frames}</p>
                            </div>
                            <div className="info-row">
                                <p className="info-text">Color Space: </p>
                                <p className="info-text-alt">{state.space}</p>
                            </div>
                        </div>
                    </div>
                </div>
                </Draggable>
            </section>
        )
    }
    return null
}

export default InfoDialog