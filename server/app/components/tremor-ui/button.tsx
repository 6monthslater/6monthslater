import { Button as TremorButton } from "@tremor/react";
import type { ButtonProps } from "@tremor/react/dist/cjs/components/input-elements/Button/Button";

const Button = (props: ButtonProps) => {
  return (
    <TremorButton
      {...props}
      className={`${props.className} `}
      color={"cyan"}
    ></TremorButton>
  );
};

export default Button;
