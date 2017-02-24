import React, { Component } from 'react'
import { NativeTypes } from 'react-dnd-html5-backend'
import { DropTarget } from 'react-dnd'

import Failed from './svg/Failed'
import Done from './svg/Done'
import Converting from './svg/Converting'
import Idle from './svg/Idle'
import Merge from './svg/Merge'
import Convert from './svg/Convert'
import ArrowDown from './svg/ArrowDown'
import Cancel from './svg/Cancel'

import { convert } from '../api'
import { removeByKey, uniqueFiles } from '../helpers/util'

const drop = (props, monitor, component) => {
  const { files } = monitor.getItem()
  const filesUnique = uniqueFiles(component.state.files, files)
  component.setState({
    status: Object.keys(filesUnique).length ? 'STAGING' : 'IDLE',
    files: filesUnique
  })

  if (component.state.shifted) {
    component.convert()
  }
}

class Sanitizer extends Component {
  constructor(props) {
    super(props)

    this.state = {
      status: 'IDLE',
      operation: 'CONVERT',
      files: {}
    }

    this.isHover = this.isHover.bind(this)
    this.getIconObject = this.getIconObject.bind(this)
    this.getMessage = this.getMessage.bind(this)
    this.convert = this.convert.bind(this)
    this.componentDidMount = this.componentDidMount.bind(this)
  }

  componentDidMount() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') {
        this.setState({
          shifted: true
        })
      }
    })
    window.addEventListener('keyup', () => {
      this.setState({
        shifted: false
      })
    })
  }

  componentWillUnmount() {
    window.removeEventListener('keyup')
    window.removeEventListener('keydown')
  }

  getMessage() {
    switch (this.state.status) {
      case 'IDLE': return (
        <div>
          <h1>
            { this.isHover() ? 'Drop' : 'Drag & drop' }
          </h1>
          <p className="detail">
            {`your files here to ${this.state.shifted ? 'convert' : 'add them'}`}
          </p>
        </div>
      )
      case 'CONVERTING': return (
        <div>
          <h1>
            Converting
          </h1>
          <p className="detail">(this should only take a sec)</p>
        </div>
      )
      case 'DONE': return (
        <div>
          <h1>
            Complete!
          </h1>
          <p className="detail">{`${this.state.fileName || 'File'} created`}</p>
        </div>
      )
      case 'FAILED': return (
        <div>
          <h1>
            Conversion failed
          </h1>
          <p className="detail">Uh oh, something went wrong 😕</p>
        </div>
      )
      default: return null
    }
  }

  getIconObject() {
    switch (this.state.status) {
      case 'FAILED': return <Failed />
      case 'DONE': return <Done />
      case 'CONVERTING': return <Converting />
      case 'STAGING': return (
        <div className="staging">
          <input type="text" value="Alchemy-1.txt" />
          <div className="row">
            <div className="switch">
              <button
                className={`switch__btn merge ${this.state.operation === 'MERGE' ? 'switch__btn-active' : ''}`}
                onClick={() => this.setState({ operation: 'MERGE' })}
              >
                <Merge />
                <div>Merge</div>
              </button>
              <button
                className={`switch__btn convert ${this.state.operation === 'CONVERT' ? 'switch__btn-active' : ''}`}
                onClick={() => this.setState({ operation: 'CONVERT' })}
              >
                <Convert />
                <div>Convert</div>
              </button>
            </div>
            <div className="dropdown">
              <select name="file-type">
                <option value="gif">GIF</option>
                <option value="pdf">PDF</option>
              </select>
              <ArrowDown />
            </div>
          </div>
          <div className="file-list">
            {
              Object.keys(this.state.files).map(key =>
                <div className="file-list__item" key={key}>
                  <div>{this.state.files[key].name}</div>
                  <button
                    className="close-btn"
                    onClick={() => this.setState({ files: removeByKey(this.state.files, key) })}
                  >
                    <Cancel />
                  </button>
                </div>
              )
            }
          </div>
          <button className="button__convert" onClick={() => { this.convert() }}>{this.state.operation}</button>
        </div>
      )
      default: return <Idle />
    }
  }

  convert() {
    const filtered = Object.keys(this.state.files)
                           .map(key => this.state.files[key])
                           .filter(file => file.type.includes('image'))

    if (filtered.length) {
      this.setState({
        status: 'CONVERTING'
      })

      convert({
        files: filtered.map(f => f.path),
        outputPath: filtered[0].path
                               .slice(0, filtered[0].path.length - filtered[0].name.length)
      }).then((fileName) => {
        this.setState({
          status: 'DONE',
          fileName
        })
        setTimeout(() => {
          this.setState({
            status: 'IDLE',
            files: {},
          })
        }, 3000)
      }).catch((err) => {
        alert(`ERR: ${err}`)
        this.setState({
          status: 'FAILED'
        })
        setTimeout(() => {
          this.setState({
            status: 'IDLE',
            files: {},
          })
        }, 3000)
      })
    } else this.setState({ status: 'IDLE' })
  }

  isHover() {
    return this.props.isOver && this.state.status !== 'CONVERTING'
  }

  render() {
    const { connectDropTarget } = this.props
    return connectDropTarget(
      <div
        className={`container ${this.state.status === 'STAGING' ? 'no-padding ' : ''}
          ${(this.state.status === 'IDLE') ?
         (this.isHover() ? 'border-hover' : 'border-dashed') : ''}`}
      >
        {this.getIconObject()}
        {this.getMessage()}
      </div>
    )
  }
}

// { drop } since other functions can be passed here
export default DropTarget(NativeTypes.FILE, { drop }, (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
  itemType: monitor.getItemType(),
  item: monitor.getItem()
}))(Sanitizer)
