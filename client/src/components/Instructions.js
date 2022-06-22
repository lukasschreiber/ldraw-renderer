import React from 'react';
import './Instructions.css';

const Instructions = (props) => {
    if (props.instructions) {
        return (
            <div className='instructions'>
                {props.instructions.map((instruction, index) => (
                    <a href={instruction.url} target="_blank" rel="noreferrer" key={`instruction${index}`}>
                        <img src={instruction.image.src} alt={instruction.image.alt} height="200px"/><br />
                        {instruction.name} <br />
                        {instruction.paper} <br />
                        {instruction.size}<br />
                    </a>
                ))}
            </div>
        );
    }

};

export default Instructions;