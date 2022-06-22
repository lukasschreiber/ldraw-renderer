import { Themes } from '../mongo/index.js';

export const getTheme = async (name) => {
    const themes = await Themes.find({ $text: { $search: name } }).toArray();
    return (await themes);
};

export default getTheme;