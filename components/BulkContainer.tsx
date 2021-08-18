import React, {useEffect, useState, useRef} from "react"
import {ipcRenderer} from "electron"
import "../styles/bulkcontainer.less"

interface BulkProps {
    files: string[]
}

const BulkContainer: React.FunctionComponent<BulkProps> = (props: BulkProps) => {
    const generateJSX = () => {
        const jsxArray = []
        const height = 1000 / props.files.length > 100 ? 1000 / props.files.length : 100
        for (let i = 0; i < props.files.length; i++) {
            // @ts-ignore
            jsxArray.push(<img className="bulk-img" src={props.files[i]} style={{"max-height": `${height}px`, width: "auto"}}/>)
        }
        return jsxArray
    }
    return (
        <main className="bulk-container">
            <div className="bulk-img-container">
                {generateJSX()}
            </div>
        </main>
    )
}

export default BulkContainer