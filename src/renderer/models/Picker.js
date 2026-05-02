import Pickr from "@simonwep/pickr/dist/pickr.es5.min";

export function createPicker(onChangeHandler) {
  const pickr = Pickr.create({
    el: ".color-picker",
    theme: "monolith",
    swatches: ["#ffffff", "#0000FF", "#00FF00", "#FF0000", "#F4FF00"],
    components: {
      preview: true,
      hue: true,
      interaction: {
        hex: true,
        input: true,
      },
    },
  })
  window.picker = pickr
  pickr.on('change', onChangeHandler)
  return pickr
}
