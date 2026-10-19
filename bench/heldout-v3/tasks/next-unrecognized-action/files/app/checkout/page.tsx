import { placeOrder } from "./actions";

export default function CheckoutPage() {
  async function submit(formData: FormData) {
    "use server";
    await placeOrder(formData.getAll("item").map(String));
  }
  return (
    <form action={submit}>
      <input type="hidden" name="item" value="item-42" />
      <button type="submit">Place order</button>
    </form>
  );
}
