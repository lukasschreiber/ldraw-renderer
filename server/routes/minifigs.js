import sources from '../db/sources.json' assert {type: 'json'};

export const getMinifigs = async (id) => {
    const minifigs = (await fetch(`https://rebrickable.com/api/v3/lego/sets/${id}/minifigs/`, {
        headers: {
            Accept: "application/json",
            Authorization: `key ${process.env.REBRICKABLE_SECRET}`
        }
    }).then(res => res.json())).results.map(minifig => ({
        id: minifig.id.toString(),
        name: minifig.set_name,
        quantity: minifig.quantity.toString(),
        image: {
            src: minifig.set_img_url,
            alt: minifig.set_name,
            source: sources.rebrickable
        }
    }));

    return minifigs;
};