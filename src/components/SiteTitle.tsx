import { Title } from "@solidjs/meta";

export default function MySiteTitle(props: { children: string }) {
    return <Title>{props.children} - RideHub</Title>;
}
