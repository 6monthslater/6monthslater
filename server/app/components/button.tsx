import { Button as TremorButton } from "@tremor/react";

const Button = (props) => {
  return (
    <TremorButton
      {...props}
      className={`${props.className} `}
      color={"cyan"}
    ></TremorButton>
  );
};

export default Button;
