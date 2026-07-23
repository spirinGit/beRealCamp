ALTER TABLE "coin_transactions"
ADD CONSTRAINT "coin_transactions_amount_sign_check"
CHECK ((("type" = 'earn' and "amount" > 0) or ("type" = 'spend' and "amount" < 0)));

ALTER TABLE "reward_items"
ADD CONSTRAINT "reward_items_price_positive_check"
CHECK ("price" > 0);