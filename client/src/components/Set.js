import React, { useState } from "react";
import { useParams } from "react-router-dom";
import Instructions from "./Instructions";
import './Set.css';

function Set() {
    const { set_num } = useParams();
    const [data, setData] = useState(null);
    const [images, setImages] = useState(null);
    const [minifigs, setMinifigs] = useState(null);

    React.useEffect(() => {
        fetch(`/sets/${set_num}`)
            .then((res) => res.json())
            .then((data) => setData(data));

        fetch(`/sets/${set_num}/images`)
            .then((res) => res.json())
            .then((data) => setImages(data));

        fetch(`/sets/${set_num}/minifigs`)
            .then((res) => res.json())
            .then((data) => setMinifigs(data));

    }, [set_num]);

    return (
        <div className="set">
            <div>{!data ? "Loading..." :
                <div key={data.set_num}>
                    <h3>{data.name}#{data.set_num}</h3><br />
                    <img src={data.image.src} alt={data.image.alt} /><br />
                    Themes: {data.themes.join(" - ")}<br />
                    No of Parts: {data.num_parts}<br />
                    No of Spares: {data.num_spare_parts}<br />
                    No of Minifigs: {data.num_minifigs}<br />
                    Year: {data.year}<br />
                    <Instructions instructions={data.instructions} />
                </div>
            }</div>
            <div>{!images ? "Loading..." : images.map((image, index) => (
                <div key={index}>
                    <img src={image.src} alt={image.alt} width="600px" /><br />
                </div>
            ))}</div>
            <div>{!minifigs ? "Loading..." : minifigs.map((minifig, index) => (
                <div key={index}>
                    <img src={minifig.image.src} alt={minifig.image.alt} height="100px" /><br />
                    {minifig.name}
                </div>
            ))}</div>
        </div>
    );
}

export default Set;